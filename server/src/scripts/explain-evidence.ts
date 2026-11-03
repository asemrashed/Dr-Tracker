/**
 * Runs the app's real queries with explain('executionStats') against MongoDB and prints a Markdown
 * table (also saved to docs/explain-results.md) for the README's indexing section.
 *
 *   npm run seed                       (or: npm run seed:demo -- --patients=20000 for a bigger collection)
 *   npm run explain
 *
 * Exit code 1 if any query does a COLLSCAN on a collection with >= 1000 documents.
 * Note: on tiny collections MongoDB may legitimately pick a collection scan; use more data to see index behavior.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { Doctor } from '../modules/doctors/doctor.model';
import { Patient } from '../modules/patients/patient.model';
import { summarizeExplain } from './explain-plan';

interface Row {
  name: string;
  collection: 'doctors' | 'patients';
  explain: () => Promise<unknown>;
}

async function main() {
  await connectDb();
  const [doctorCount, patientCount] = await Promise.all([Doctor.estimatedDocumentCount(), Patient.estimatedDocumentCount()]);
  const sample = await Doctor.find({ isDeleted: false }).sort({ _id: 1 }).limit(10).select('_id specialization').lean();
  if (sample.length === 0) throw new Error('No doctors found. Run `npm run seed` first.');
  const doctorId = sample[0]!._id;
  const specialization = sample[0]!.specialization;
  const ids = sample.map((d) => d._id);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const active = { isDeleted: false };
  const ex = (q: { explain: (v: 'executionStats') => Promise<unknown> }) => q.explain('executionStats');

  const rows: Row[] = [
    { name: 'Doctors: default list (newest first, page 1)', collection: 'doctors', explain: () => ex(Doctor.find(active).sort({ createdAt: -1, _id: -1 }).limit(10)) },
    { name: 'Doctors: name prefix search "dr. a", sorted by name', collection: 'doctors', explain: () => ex(Doctor.find({ ...active, nameLower: { $regex: '^dr\\. a' } }).sort({ nameLower: 1, _id: 1 }).limit(10)) },
    { name: 'Doctors: filter by specialization, newest first', collection: 'doctors', explain: () => ex(Doctor.find({ ...active, specialization }).sort({ createdAt: -1, _id: -1 }).limit(10)) },
    { name: 'Doctors: reassign candidates (same specialization)', collection: 'doctors', explain: () => ex(Doctor.find({ ...active, specialization, _id: { $ne: doctorId } }).sort({ nameLower: 1 }).limit(100)) },
    { name: 'Doctors: duplicate e-mail check (partial unique index)', collection: 'doctors', explain: () => ex(Doctor.find({ email: 'someone@example.com', isDeleted: false }).limit(1)) },
    { name: 'Doctors: added in the last 30 days (dashboard count)', collection: 'doctors', explain: () => ex(Doctor.find({ ...active, createdAt: { $gte: since } })) },
    { name: 'Patients: one doctor’s patients, newest first', collection: 'patients', explain: () => ex(Patient.find({ ...active, doctorId }).sort({ createdAt: -1, _id: -1 }).limit(10)) },
    { name: 'Patients: counts for a page of 10 doctors (grouped)', collection: 'patients', explain: () => ex(Patient.aggregate([{ $match: { ...active, doctorId: { $in: ids } } }, { $group: { _id: '$doctorId', count: { $sum: 1 } } }])) },
    { name: 'Patients: default list (newest first, page 1)', collection: 'patients', explain: () => ex(Patient.find(active).sort({ createdAt: -1, _id: -1 }).limit(10)) },
    { name: 'Patients: name prefix search "an", sorted by name', collection: 'patients', explain: () => ex(Patient.find({ ...active, nameLower: { $regex: '^an' } }).sort({ nameLower: 1, _id: 1 }).limit(10)) },
    { name: 'Patients: condition filter + date range, newest first', collection: 'patients', explain: () => ex(Patient.find({ ...active, condition: 'Asthma', createdAt: { $gte: since } }).sort({ createdAt: -1, _id: -1 }).limit(10)) },
    { name: 'Dashboard: patients per day (last 30 days)', collection: 'patients', explain: () => ex(Patient.aggregate([{ $match: { ...active, createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } }])) },
    { name: 'Dashboard: patients per doctor, top 8', collection: 'patients', explain: () => ex(Patient.aggregate([{ $match: active }, { $group: { _id: '$doctorId', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 8 }])) },
    { name: 'Dashboard: patients by condition', collection: 'patients', explain: () => ex(Patient.aggregate([{ $match: active }, { $group: { _id: '$condition', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }])) },
  ];

  const lines = [
    `Collections: **${doctorCount}** doctors, **${patientCount}** patients (generated ${new Date().toISOString().slice(0, 10)}).`,
    '',
    '| Query | Plan | Index used | Keys | Docs | Returned | ms |',
    '|---|---|---|---:|---:|---:|---:|',
  ];
  let failed = false;
  for (const row of rows) {
    const s = summarizeExplain(await row.explain());
    const size = row.collection === 'doctors' ? doctorCount : patientCount;
    if (s.collscan && size >= 1000) failed = true;
    const plan = [...new Set(s.stages)].join(' → ') + (s.inMemorySort ? ' (in-memory sort)' : '');
    lines.push(
      `| ${row.name} | ${s.collscan ? '**COLLSCAN**' : ''}${plan} | ${s.indexes.join(', ') || '-'} | ${s.keysExamined ?? '-'} | ${s.docsExamined ?? '-'} | ${s.returned ?? '-'} | ${s.millis ?? '-'} |`,
    );
  }

  const md = lines.join('\n');
  console.log(`\n${md}\n`);
  const file = path.resolve(__dirname, '../../../docs/explain-results.md');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${md}\n`);
  console.log(`Saved to ${path.relative(process.cwd(), file)}`);
  if (failed) {
    console.error('A query did a COLLSCAN on a collection with >= 1000 documents. Check the indexes.');
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
