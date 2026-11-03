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
import { useDoctorOptions, useUpdatePatient } from '../hooks';
import { PATIENT_FIELDS, patientEditSchema, type PatientFormValues } from '../schemas';
import { PatientFields } from './patient-fields';

interface Props {
  patient: Patient;
  /** Called once the exit animation has finished (or the patient was saved). */
  onClose: () => void;
}

/** Edit slide-over for the patients page, including reassigning the patient to another doctor. */
export function EditPatientSheet({ patient, onClose }: Props) {
  const [open, setOpen] = useState(true);
  const close = () => {
    setOpen(false);
    window.setTimeout(onClose, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent variant="sheet" title="Edit patient" description={patient.name}>
        <EditForm patient={patient} onDone={close} />
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ patient, onDone }: { patient: Patient; onDone: () => void }) {
  const update = useUpdatePatient(patient.id);
  const doctors = useDoctorOptions();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientEditSchema) as Resolver<PatientFormValues>,
    defaultValues: {
      name: patient.name,
      age: String(patient.age),
      gender: patient.gender,
      phone: patient.phone,
      condition: patient.condition,
      doctorId: patient.doctorId,
    },
  });

  const submit = handleSubmit((values) => {
    setFormError(null);
    update.mutate(values, {
      onSuccess: () => {
        toast.success('Patient updated');
        onDone();
      },
      onError: (err) => {
        if (!applyServerErrors(err, setError, PATIENT_FIELDS)) setFormError(err.message);
      },
    });
  });

  const busy = update.isPending || update.isSuccess;

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {formError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-input bg-danger-50 px-3.5 py-3 text-sm text-danger-700">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}
        <PatientFields register={register} errors={errors} idPrefix="edit" />

        <Field label="Doctor" htmlFor="edit-doctor" error={errors.doctorId?.message} hint="Choosing another doctor moves this patient.">
          {doctors.isPending ? (
            <Skeleton className="h-11 w-full rounded-input" />
          ) : (
            <Select {...fieldProps('edit-doctor', errors.doctorId)} {...register('doctorId')}>
              {doctors.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.specialization}
                </option>
              ))}
              {/* Keep the current value valid if the options failed to load. */}
              {doctors.isError && patient.doctor && <option value={patient.doctorId}>{patient.doctor.name}</option>}
            </Select>
          )}
        </Field>
      </div>
      <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={busy}>Cancel</Button>
        </DialogClose>
        <Button type="submit" loading={busy} disabled={!isDirty && !busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
