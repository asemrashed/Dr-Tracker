import { api } from '@/lib/api';
import type { Condition, Gender } from '@/lib/constants';

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
}

export const deletePatient = (id: string) => api(`/patients/${id}`, { method: 'DELETE' });
