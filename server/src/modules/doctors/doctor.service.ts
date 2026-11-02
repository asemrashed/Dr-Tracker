import { Types } from 'mongoose';
import { AppError } from '../../shared/AppError';
import { SPECIALIZATIONS } from '../../shared/constants';
import { buildMeta } from '../../shared/pagination';
import { createdAtFilter, namePrefixFilter } from '../../shared/search';
import { runAtomically } from '../../shared/transaction';
import { Patient } from '../patients/patient.model';
import { Doctor } from './doctor.model';
import type { CreateDoctorInput, ListDoctorsQuery, UpdateDoctorInput } from './doctor.schema';

interface DoctorRecord {
  _id: Types.ObjectId;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const toDTO = (d: DoctorRecord, patientCount?: number) => ({
  id: String(d._id),
  name: d.name,
  specialization: d.specialization,
  hospital: d.hospital,
  phone: d.phone,
  email: d.email,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
  ...(patientCount !== undefined ? { patientCount } : {}),
});

const SORT_FIELDS = {
  name: 'nameLower',
  specialization: 'specialization',
  hospital: 'hospital',
  createdAt: 'createdAt',
} as const;

/** Active patients per doctor for a page of doctors: one grouped query, served by the doctorId index. */
async function patientCounts(doctorIds: Types.ObjectId[]) {
  if (doctorIds.length === 0) return new Map<string, number>();
  const rows = await Patient.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { isDeleted: false, doctorId: { $in: doctorIds } } },
    { $group: { _id: '$doctorId', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

const activePatientCount = (doctorId: string | Types.ObjectId, session?: import('mongoose').ClientSession) =>
  Patient.countDocuments({ isDeleted: false, doctorId }).session(session ?? null);

async function findActive(id: string) {
  const doctor = await Doctor.findOne({ _id: id, isDeleted: false });
  if (!doctor) throw AppError.notFound('Doctor not found');
  return doctor;
}

async function assertEmailFree(email: string, exceptId?: string) {
  const taken = await Doctor.exists({
    email,
    isDeleted: false,
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  });
  if (taken) {
    throw AppError.conflict('A doctor with this email already exists', 'EMAIL_TAKEN', [
      { field: 'email', message: 'A doctor with this email already exists' },
    ]);
  }
}

export async function list(q: ListDoctorsQuery) {
  const filter = {
    isDeleted: false,
    ...namePrefixFilter(q.search),
    ...(q.specialization ? { specialization: q.specialization } : {}),
    ...(q.hospital ? { hospital: q.hospital } : {}),
    ...createdAtFilter(q.from, q.to),
  };
  const dir = q.order === 'asc' ? 1 : -1;

  const [docs, total] = await Promise.all([
    Doctor.find(filter)
      .sort({ [SORT_FIELDS[q.sort]]: dir, _id: dir })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Doctor.countDocuments(filter),
  ]);

  const counts = await patientCounts(docs.map((d) => d._id));
  return {
    items: docs.map((d) => toDTO(d, counts.get(String(d._id)) ?? 0)),
    meta: buildMeta(q.page, q.limit, total),
  };
}

export async function getById(id: string) {
  const doctor = await findActive(id);
  return toDTO(doctor.toObject(), await activePatientCount(doctor._id));
}

export async function create(input: CreateDoctorInput) {
  await assertEmailFree(input.email);
  const doctor = await Doctor.create(input);
  return toDTO(doctor.toObject(), 0);
}

export async function update(id: string, input: UpdateDoctorInput) {
  const doctor = await findActive(id);
  if (input.email && input.email !== doctor.email) await assertEmailFree(input.email, id);

  // Changing specialization is allowed: it only affects which doctors can receive this
  // doctor's patients in a future delete. Existing assignments are not re-validated.
  doctor.set(input);
  await doctor.save(); // save() (not updateOne) so the nameLower hook runs
  return toDTO(doctor.toObject(), await activePatientCount(doctor._id));
}

export async function getMeta() {
  const hospitals = (await Doctor.distinct('hospital', { isDeleted: false })) as string[];
  return {
    specializations: [...SPECIALIZATIONS],
    hospitals: hospitals.sort((a, b) => a.localeCompare(b)),
  };
}

/**
 * Plain delete. Only allowed when the doctor has no active patients.
 * Soft-deletes first, then re-counts: a patient created in the gap is caught and the delete undone.
 */
export async function remove(id: string) {
  const doctor = await findActive(id);

  const patientCount = await activePatientCount(doctor._id);
  if (patientCount > 0) throw hasPatientsError(doctor.specialization, patientCount);

  const res = await Doctor.updateOne(
    { _id: doctor._id, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date() } },
  );
  if (res.matchedCount === 0) throw AppError.notFound('Doctor not found');

  const late = await activePatientCount(doctor._id);
  if (late > 0) {
    await Doctor.updateOne({ _id: doctor._id }, { $set: { isDeleted: false }, $unset: { deletedAt: 1 } });
    throw hasPatientsError(doctor.specialization, late);
  }
}

const hasPatientsError = (specialization: string, patientCount: number) =>
  AppError.conflict(
    `This doctor has ${patientCount} patient${patientCount === 1 ? '' : 's'}. Move them to another ${specialization} doctor first.`,
    'DOCTOR_HAS_PATIENTS',
    { patientCount, specialization },
  );

/** Doctors that can take over this doctor's patients: same specialization, active, not the doctor itself. */
export async function reassignCandidates(id: string) {
  const source = await findActive(id);
  const [docs, patientCount] = await Promise.all([
    Doctor.find({
      isDeleted: false,
      specialization: source.specialization,
      _id: { $ne: source._id },
    })
      .sort({ nameLower: 1 })
      .limit(100)
      .lean(),
    activePatientCount(source._id),
  ]);
  const counts = await patientCounts(docs.map((d) => d._id));

  return {
    specialization: source.specialization,
    patientCount,
    candidates: docs.map((d) => toDTO(d, counts.get(String(d._id)) ?? 0)),
  };
}

/**
 * Move every active patient of `id` to `targetId`, then soft-delete `id`.
 *
 * Rules enforced here (the UI is never trusted):
 *   source exists and is active; target exists, is active, is a different doctor, and has the
 *   SAME specialization.
 * Order matters: patients move first, the doctor is deleted last. Without a transaction
 * (standalone mongod) a crash in between leaves the doctor active with fewer patients, so
 * simply retrying is safe. With a transaction (Atlas / replica set) it is all-or-nothing.
 */
export async function reassignAndDelete(id: string, targetDoctorId: string) {
  if (id === targetDoctorId) throw AppError.badRequest('Choose a different doctor to receive the patients');

  return runAtomically(async (session) => {
    const source = await Doctor.findOne({ _id: id, isDeleted: false }).session(session ?? null);
    if (!source) throw AppError.notFound('Doctor not found');

    const target = await Doctor.findOne({ _id: targetDoctorId, isDeleted: false }).session(session ?? null);
    if (!target) throw AppError.notFound('Target doctor not found');
    if (target.specialization !== source.specialization) {
      throw AppError.badRequest(`Patients can only be moved to another ${source.specialization} doctor`);
    }

    const moved = await Patient.updateMany(
      { isDeleted: false, doctorId: source._id },
      { $set: { doctorId: target._id } },
      { session },
    );

    const res = await Doctor.updateOne(
      { _id: source._id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { session },
    );
    if (res.matchedCount === 0) throw AppError.notFound('Doctor not found');

    // A patient added to the source between the move and now would be orphaned: refuse (and roll back).
    const remaining = await activePatientCount(source._id, session);
    if (remaining > 0) throw hasPatientsError(source.specialization, remaining);

    return {
      movedCount: moved.modifiedCount,
      deletedDoctor: { id: String(source._id), name: source.name },
      targetDoctor: { id: String(target._id), name: target.name },
    };
  });
}
