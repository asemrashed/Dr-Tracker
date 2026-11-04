'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { applyServerErrors, fieldProps } from '@/lib/forms';
import type { Patient } from '../api';
import { useCreatePatient, useDoctorOptions } from '../hooks';
import { PATIENT_FIELDS, patientEditSchema, type PatientFormValues } from '../schemas';
import { PatientFields } from './patient-fields';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePatientSheet({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="sheet" title="Add patient" description="Register a new patient and assign them to an active doctor.">
        <CreateForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const create = useCreatePatient();
  const doctors = useDoctorOptions();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientEditSchema) as Resolver<PatientFormValues>,
    defaultValues: {
      name: '',
      age: '',
      gender: undefined,
      phone: '',
      condition: undefined,
      doctorId: '',
    },
  });

  const submit = handleSubmit((values) => {
    if (!values.doctorId) {
      setError('doctorId', { message: 'Choose a doctor' });
      return;
    }
    setFormError(null);
    create.mutate(
      { ...values, doctorId: values.doctorId },
      {
        onSuccess: (p: Patient) => {
          toast.success(`${p.name} added`);
          onDone();
        },
        onError: (err: unknown) => {
          if (!applyServerErrors(err, setError, PATIENT_FIELDS)) {
            setFormError(err instanceof Error ? err.message : 'Failed to add patient');
          }
        },
      },
    );
  });

  const busy = create.isPending || create.isSuccess;

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {formError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-input bg-danger-50 px-3.5 py-3 text-sm text-danger-700">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}
        <PatientFields register={register} errors={errors} idPrefix="create" />

        <Field label="Doctor" htmlFor="create-doctor" error={errors.doctorId?.message} hint="Select the primary attending doctor.">
          {doctors.isPending ? (
            <Skeleton className="h-11 w-full rounded-input" />
          ) : (
            <Select {...fieldProps('create-doctor', errors.doctorId)} {...register('doctorId')}>
              <option value="">Select a doctor…</option>
              {doctors.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.specialization}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={busy}>Cancel</Button>
        </DialogClose>
        <Button type="submit" loading={busy}>{busy ? 'Adding…' : 'Add patient'}</Button>
      </div>
    </form>
  );
}

