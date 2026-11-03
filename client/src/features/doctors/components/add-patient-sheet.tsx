'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { applyServerErrors } from '@/lib/forms';
import { PatientFields } from '@/features/patients/components/patient-fields';
import { PATIENT_FIELDS, patientFormSchema, type PatientFormValues } from '@/features/patients/schemas';
import { useAddPatient } from '../hooks';

interface Props {
  doctorId: string;
  doctorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Slide-over form. The form lives inside the dialog content, so it resets every time it opens. */
export function AddPatientSheet({ doctorId, doctorName, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="sheet" title="Add patient" description={`Assigned to ${doctorName}.`}>
        <PatientForm doctorId={doctorId} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PatientForm({ doctorId, onDone }: { doctorId: string; onDone: () => void }) {
  const add = useAddPatient(doctorId);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: { name: '', age: '', phone: '', gender: undefined, condition: undefined },
  });

  const submit = handleSubmit((values) => {
    setFormError(null);
    add.mutate(values, {
      onSuccess: (p) => {
        toast.success(`${p.name} added`);
        onDone();
      },
      onError: (err) => {
        if (!applyServerErrors(err, setError, PATIENT_FIELDS)) setFormError(err.message);
      },
    });
  });

  const busy = add.isPending || add.isSuccess;

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {formError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-input bg-danger-50 px-3.5 py-3 text-sm text-danger-700">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}
        <PatientFields register={register} errors={errors} idPrefix="add" />
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
