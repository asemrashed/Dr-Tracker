import { api, apiPage, qs } from '@/lib/api';
import type { Specialization } from '@/lib/constants';
import type { Patient } from '@/features/patients/api';
import type { DoctorFormValues } from './schemas';
import type { PatientFormValues } from '@/features/patients/schemas';

export interface Doctor {
  id: string;
  name: string;
  specialization: Specialization;
  hospital: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  patientCount?: number;
}

export type DoctorSort = 'name' | 'specialization' | 'hospital' | 'createdAt';

export interface DoctorListParams {
  page: number;
  search?: string;
  specialization?: string;
  hospital?: string;
  from?: string;
  to?: string;
  sort: DoctorSort;
  order: 'asc' | 'desc';
}

export interface DoctorMeta {
  specializations: Specialization[];
  hospitals: string[];
}

export interface ReassignCandidates {
  specialization: Specialization;
  patientCount: number;
  candidates: Doctor[];
}

export interface ReassignResult {
  movedCount: number;
  deletedDoctor: { id: string; name: string };
  targetDoctor: { id: string; name: string };
}

/** Details attached to the 409 DOCTOR_HAS_PATIENTS error. */
export interface HasPatientsDetails {
  patientCount: number;
  specialization: Specialization;
}

export const listDoctors = (p: DoctorListParams) => apiPage<Doctor>(`/doctors${qs({ ...p, limit: 10 })}`);
export const getDoctor = (id: string) => api<Doctor>(`/doctors/${id}`);
export const createDoctor = (v: DoctorFormValues) => api<Doctor>('/doctors', { method: 'POST', json: v });
export const updateDoctor = (id: string, v: DoctorFormValues) =>
  api<Doctor>(`/doctors/${id}`, { method: 'PATCH', json: v });
export const deleteDoctor = (id: string) => api(`/doctors/${id}`, { method: 'DELETE' });
export const fetchDoctorMeta = () => api<DoctorMeta>('/doctors/meta/specializations');
export const fetchReassignCandidates = (id: string) => api<ReassignCandidates>(`/doctors/${id}/reassign-candidates`);
export const reassignAndDelete = (id: string, targetDoctorId: string) =>
  api<ReassignResult>(`/doctors/${id}/reassign-and-delete`, { method: 'POST', json: { targetDoctorId } });

export const listDoctorPatients = (id: string, p: { page: number; search?: string }) =>
  apiPage<Patient>(`/doctors/${id}/patients${qs({ ...p, limit: 10 })}`);
export const createDoctorPatient = (id: string, v: PatientFormValues) =>
  api<Patient>(`/doctors/${id}/patients`, { method: 'POST', json: { ...v, age: Number(v.age) } });
