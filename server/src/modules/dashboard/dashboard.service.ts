import { Doctor } from '../doctors/doctor.model';
import { Patient } from '../patients/patient.model';
import { fillDays, periodBounds } from './dashboard.utils';

const TOP_DOCTORS = 8;

/**
 * Everything the dashboard needs in one response. All figures come from MongoDB aggregations or
 * counts (nothing is computed by loading documents into memory) and run in parallel. Soft-deleted
 * records are excluded everywhere. Each query is served by an index from Master-plan section 7:
 *   per doctor   {isDeleted, doctorId, createdAt}   (group on doctorId)
 *   per day      {isDeleted, createdAt}             (range scan on createdAt)
 *   per condition {isDeleted, condition, createdAt} (group on condition)
 *   doctors      {isDeleted, createdAt}             (period counts)
 * Days are UTC days. Per-doctor and per-condition breakdowns are "right now" (all active patients);
 * only the totals-added and the time series follow the selected period.
 */
export async function stats(days: number, now = new Date()) {
  const { from, prevFrom } = periodBounds(days, now);
  const active = { isDeleted: false };
  const inPeriod = { isDeleted: false, createdAt: { $gte: from } };
  const inPrevious = { isDeleted: false, createdAt: { $gte: prevFrom, $lt: from } };

  const [doctors, patients, patientsAdded, patientsAddedPrev, doctorsAdded, doctorsAddedPrev, perDoctor, perDay, perCondition] =
    await Promise.all([
      Doctor.countDocuments(active),
      Patient.countDocuments(active),
      Patient.countDocuments(inPeriod),
      Patient.countDocuments(inPrevious),
      Doctor.countDocuments(inPeriod),
      Doctor.countDocuments(inPrevious),
      Patient.aggregate<{ _id: unknown; count: number }>([
        { $match: active },
        { $group: { _id: '$doctorId', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: TOP_DOCTORS },
      ]),
      Patient.aggregate<{ _id: string; count: number }>([
        { $match: inPeriod },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      ]),
      Patient.aggregate<{ _id: string; count: number }>([
        { $match: active },
        { $group: { _id: '$condition', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
    ]);

  // Names for the top doctors: one small lookup by id (the page is at most 8 ids).
  const docs = await Doctor.find({ _id: { $in: perDoctor.map((r) => r._id) } })
    .select('name specialization')
    .lean();
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  const patientsPerDoctor = perDoctor.map((r) => {
    const d = byId.get(String(r._id));
    return {
      doctorId: String(r._id),
      name: d?.name ?? 'Unknown doctor',
      specialization: d?.specialization ?? '',
      count: r.count,
    };
  });
  const listed = patientsPerDoctor.reduce((sum, r) => sum + r.count, 0);

  return {
    range: { days, from: from.toISOString().slice(0, 10) },
    totals: { doctors, patients, patientsAdded, patientsAddedPrev, doctorsAdded, doctorsAddedPrev },
    patientsPerDoctor,
    // Everyone not in the top list, so the bars always add up to the total.
    othersCount: Math.max(0, patients - listed),
    series: fillDays(perDay, from, days),
    conditions: perCondition.map((r) => ({ condition: r._id, count: r.count })),
  };
}
