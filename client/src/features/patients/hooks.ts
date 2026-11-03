'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deletePatient, fetchDoctorOptions, listPatients, updatePatient, type PatientListParams } from './api';
import type { PatientFormValues } from './schemas';

export const patientKeys = {
  all: ['patients'] as const,
  list: (p: PatientListParams) => ['patients', 'list', p] as const,
  doctorOptions: ['patients', 'doctor-options'] as const,
};

export const usePatients = (params: PatientListParams) =>
  useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () => listPatients(params),
    placeholderData: keepPreviousData,
  });

/** Doctors for the filter and the reassign select. Cached for a few minutes; mutations refresh it. */
export const useDoctorOptions = () =>
  useQuery({ queryKey: patientKeys.doctorOptions, queryFn: fetchDoctorOptions, staleTime: 5 * 60_000 });

/** A patient change also changes doctor lists (counts), the dashboard and doctor-options. */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['doctors'] }),
      qc.invalidateQueries({ queryKey: patientKeys.all }),
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
}

export function useUpdatePatient(id: string) {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (v: PatientFormValues) => updatePatient(id, v), onSuccess: invalidate });
}

export function useDeletePatient() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => deletePatient(id),
    onSuccess: () => {
      toast.success('Patient deleted');
      return invalidate();
    },
  });
}
