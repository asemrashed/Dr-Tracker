'use client';

import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useInvalidateAll } from '@/features/patients/hooks';
import type { PatientFormValues } from '@/features/patients/schemas';
import {
  createDoctor,
  createDoctorPatient,
  deleteDoctor,
  fetchDoctorMeta,
  fetchReassignCandidates,
  getDoctor,
  listDoctorPatients,
  listDoctors,
  reassignAndDelete,
  updateDoctor,
  type DoctorListParams,
} from './api';
import type { DoctorFormValues } from './schemas';

/** Query keys always include every input that changes the result. */
export const doctorKeys = {
  all: ['doctors'] as const,
  list: (p: DoctorListParams) => ['doctors', 'list', p] as const,
  detail: (id: string) => ['doctors', 'detail', id] as const,
  meta: ['doctors', 'meta'] as const,
  candidates: (id: string) => ['doctors', 'candidates', id] as const,
  patients: (id: string, p: { page: number; search?: string }) => ['doctors', 'patients', id, p] as const,
};

export const useDoctors = (params: DoctorListParams) =>
  useQuery({
    queryKey: doctorKeys.list(params),
    queryFn: () => listDoctors(params),
    placeholderData: keepPreviousData, // keep the old page on screen while the next one loads
  });

export const useDoctor = (id: string) => useQuery({ queryKey: doctorKeys.detail(id), queryFn: () => getDoctor(id) });

export const useDoctorMeta = () =>
  useQuery({ queryKey: doctorKeys.meta, queryFn: fetchDoctorMeta, staleTime: 5 * 60_000 });

export const useReassignCandidates = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: doctorKeys.candidates(id),
    queryFn: () => fetchReassignCandidates(id),
    enabled,
    staleTime: 0,
  });

export const useDoctorPatients = (id: string, params: { page: number; search?: string }) =>
  useQuery({
    queryKey: doctorKeys.patients(id, params),
    queryFn: () => listDoctorPatients(id, params),
    placeholderData: keepPreviousData,
  });

export function useCreateDoctor() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (v: DoctorFormValues) => createDoctor(v), onSuccess: invalidate });
}

export function useUpdateDoctor(id: string) {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (v: DoctorFormValues) => updateDoctor(id, v), onSuccess: invalidate });
}

export function useDeleteDoctor() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => deleteDoctor(id), onSuccess: invalidate });
}

export function useReassignAndDelete() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (v: { id: string; targetDoctorId: string }) => reassignAndDelete(v.id, v.targetDoctorId),
    onSuccess: invalidate,
  });
}

export function useAddPatient(doctorId: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (v: PatientFormValues) => createDoctorPatient(doctorId, v),
    onSuccess: invalidate,
  });
}
