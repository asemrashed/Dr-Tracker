import { Types } from 'mongoose';
import { AppError } from '../../shared/AppError';
import { buildMeta } from '../../shared/pagination';
import { createdAtFilter, namePrefixFilter } from '../../shared/search';
import { Doctor } from '../doctors/doctor.model';
import { Patient } from './patient.model';
import type {
  CreatePatientInput,
  ListDoctorPatientsQuery,
  ListPatientsQuery,
  UpdatePatientInput,
} from './patient.schema';

interface PatientRecord {
  _id: Types.ObjectId;
  name: string;
  age: number;
  gender: string;
  phone: string;
  condition: string;
  doctorId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface DoctorRef {
  id: string;
  name: string;
  specialization: string;
}

export const toPatientDTO = (p: PatientRecord, doctor?: DoctorRef | null) => ({
  id: String(p._id),
  name: p.name,
  age: p.age,
  gender: p.gender,
  phone: p.phone,
  condition: p.condition,
  doctorId: String(p.doctorId),
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  ...(doctor !== undefined ? { doctor } : {}),
});

async function assertActiveDoctor(doctorId: string) {
  const doctor = await Doctor.exists({ _id: doctorId, isDeleted: false });
  if (!doctor) throw AppError.notFound('Doctor not found');
}

export async function listForDoctor(doctorId: string, q: ListDoctorPatientsQuery) {
  await assertActiveDoctor(doctorId);
  const filter = { isDeleted: false, doctorId, ...namePrefixFilter(q.search) };

  const [items, total] = await Promise.all([
    Patient.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Patient.countDocuments(filter),
  ]);

  return { items: items.map((p) => toPatientDTO(p)), meta: buildMeta(q.page, q.limit, total) };
}

export async function createForDoctor(doctorId: string, input: CreatePatientInput) {
  await assertActiveDoctor(doctorId);
  const patient = await Patient.create({ ...input, doctorId });

  // Close the race with a concurrent doctor delete: if the doctor was deleted while we were
  // inserting, undo the insert instead of leaving an orphaned patient.
  if (!(await Doctor.exists({ _id: doctorId, isDeleted: false }))) {
    await Patient.deleteOne({ _id: patient._id });
    throw AppError.conflict('This doctor was just deleted', 'DOCTOR_DELETED');
  }
  return toPatientDTO(patient.toObject());
}

export async function create(input: { doctorId: string } & CreatePatientInput) {
  return createForDoctor(input.doctorId, input);
}

export async function softDelete(id: string) {
  const res = await Patient.updateOne(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date() } },
  );
  if (res.matchedCount === 0) throw AppError.notFound('Patient not found');
}

const SORT_FIELDS = { name: 'nameLower', age: 'age', condition: 'condition', createdAt: 'createdAt' } as const;

/** One extra query for the doctors on this page (no $lookup, keeps the patient query on its index). */
async function doctorRefs(ids: Types.ObjectId[]) {
  const unique = [...new Set(ids.map(String))];
  const docs = await Doctor.find({ _id: { $in: unique } })
    .select('name specialization')
    .lean();
  return new Map(
    docs.map((d) => [String(d._id), { id: String(d._id), name: d.name, specialization: d.specialization }]),
  );
}

export async function list(q: ListPatientsQuery) {
  const filter = {
    isDeleted: false,
    ...namePrefixFilter(q.search),
    ...(q.condition ? { condition: q.condition } : {}),
    ...(q.gender ? { gender: q.gender } : {}),
    ...(q.doctorId ? { doctorId: q.doctorId } : {}),
    ...createdAtFilter(q.from, q.to),
  };
  const dir = q.order === 'asc' ? 1 : -1;

  const [rows, total] = await Promise.all([
    Patient.find(filter)
      .sort({ [SORT_FIELDS[q.sort]]: dir, _id: dir })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Patient.countDocuments(filter),
  ]);

  const refs = await doctorRefs(rows.map((r) => r.doctorId));
  return {
    items: rows.map((r) => toPatientDTO(r, refs.get(String(r.doctorId)) ?? null)),
    meta: buildMeta(q.page, q.limit, total),
  };
}

async function findActive(id: string) {
  const patient = await Patient.findOne({ _id: id, isDeleted: false });
  if (!patient) throw AppError.notFound('Patient not found');
  return patient;
}

export async function getById(id: string) {
  const patient = await findActive(id);
  const refs = await doctorRefs([patient.doctorId]);
  return toPatientDTO(patient.toObject(), refs.get(String(patient.doctorId)) ?? null);
}

/** Edit a patient. Changing `doctorId` reassigns them; the target must be an active doctor. */
export async function update(id: string, input: UpdatePatientInput) {
  const patient = await findActive(id);
  const previousDoctorId = String(patient.doctorId);
  const movingTo = input.doctorId && input.doctorId !== previousDoctorId ? input.doctorId : undefined;

  if (movingTo && !(await Doctor.exists({ _id: movingTo, isDeleted: false }))) {
    throw AppError.badRequest('Choose an active doctor', [{ field: 'doctorId', message: 'Choose an active doctor' }]);
  }

  patient.set(input); // save() (not updateOne) so the nameLower hook runs
  await patient.save();

  // The new doctor may have been deleted while we saved: undo rather than orphan the patient.
  if (movingTo && !(await Doctor.exists({ _id: movingTo, isDeleted: false }))) {
    await Patient.updateOne({ _id: patient._id }, { $set: { doctorId: previousDoctorId } });
    throw AppError.conflict('That doctor was just deleted', 'DOCTOR_DELETED');
  }
  return getById(id);
}
