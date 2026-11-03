import { api, apiPage, qs } from '@/lib/api';
import type { Condition, Gender } from '@/lib/constants';
import type { PatientFormValues } from './schemas';

export interface DoctorRef {
  id: string;
  name: string;
  specialization: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  condition: Condition;
  doctorId: string;
  createdAt: string;
  updatedAt: string;
  /** Present on /patients endpoints. */
  doctor?: DoctorRef | null;
}

export type PatientSort = 'name' | 'age' | 'condition' | 'createdAt';

export interface PatientListParams {
  page: number;
  search?: string;
  condition?: string;
  gender?: string;
  doctorId?: string;
  from?: string;
  to?: string;
  sort: PatientSort;
  order: 'asc' | 'desc';
}

export const listPatients = (p: PatientListParams) => apiPage<Patient>(`/patients${qs({ ...p, limit: 10 })}`);
export const createPatient = (v: PatientFormValues & { doctorId: string }) =>
  api<Patient>('/patients', { method: 'POST', json: { ...v, age: Number(v.age) } });
export const updatePatient = (id: string, v: PatientFormValues) =>
  api<Patient>(`/patients/${id}`, { method: 'PATCH', json: { ...v, age: Number(v.age) } });
export const deletePatient = (id: string) => api(`/patients/${id}`, { method: 'DELETE' });
export const fetchDoctorOptions = () => api<DoctorRef[]>('/doctors/meta/options');
