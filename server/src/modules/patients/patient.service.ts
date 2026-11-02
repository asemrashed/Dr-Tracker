import { Types } from 'mongoose';
import { AppError } from '../../shared/AppError';
import { buildMeta } from '../../shared/pagination';
import { namePrefixFilter } from '../../shared/search';
import { Doctor } from '../doctors/doctor.model';
import { Patient } from './patient.model';
import type { CreatePatientInput, ListDoctorPatientsQuery } from './patient.schema';

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

export const toPatientDTO = (p: PatientRecord) => ({
  id: String(p._id),
  name: p.name,
  age: p.age,
  gender: p.gender,
  phone: p.phone,
  condition: p.condition,
  doctorId: String(p.doctorId),
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
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

  return { items: items.map(toPatientDTO), meta: buildMeta(q.page, q.limit, total) };
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

export async function softDelete(id: string) {
  const res = await Patient.updateOne(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date() } },
  );
  if (res.matchedCount === 0) throw AppError.notFound('Patient not found');
}
