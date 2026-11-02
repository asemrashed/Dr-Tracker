'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { applyServerErrors, fieldProps } from '@/lib/forms';
import { SPECIALIZATIONS } from '@/lib/constants';
import type { Doctor } from '../api';
import { useCreateDoctor, useDoctorMeta, useUpdateDoctor } from '../hooks';
import { DOCTOR_FIELDS, doctorFormSchema, type DoctorFormValues } from '../schemas';

interface Props {
  /** Present when editing. */
  doctor?: Doctor;
  /** Prefill from ?specialization= (arriving from the delete flow with no candidates). */
  defaultSpecialization?: string;
}

export function DoctorForm({ doctor, defaultSpecialization }: Props) {
  const router = useRouter();
  const create = useCreateDoctor();
  const update = useUpdateDoctor(doctor?.id ?? '');
  const hospitals = useDoctorMeta().data?.hospitals ?? [];
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = doctor ? update : create;

  const validDefault = SPECIALIZATIONS.find((s) => s === defaultSpecialization);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: {
      name: doctor?.name ?? '',
      specialization: doctor?.specialization ?? (validDefault as DoctorFormValues['specialization']),
      hospital: doctor?.hospital ?? '',
      phone: doctor?.phone ?? '',
      email: doctor?.email ?? '',
    },
  });

  const submit = handleSubmit((values) => {
    setFormError(null);
    mutation.mutate(values, {
      onSuccess: (saved) => {
        toast.success(doctor ? 'Doctor updated' : 'Doctor added');
        router.push(`/doctors/${saved.id}`);
      },
      onError: (err) => {
        if (!applyServerErrors(err, setError, DOCTOR_FIELDS)) setFormError(err.message);
      },
    });
  });

  const busy = mutation.isPending || mutation.isSuccess; // stay locked through the redirect
  const cancelHref = doctor ? `/doctors/${doctor.id}` : '/doctors';

  return (
    <form onSubmit={submit} noValidate className="max-w-2xl rounded-card border border-line bg-surface p-5 sm:p-6">
      {formError && (
        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-input bg-danger-50 px-3.5 py-3 text-sm text-danger-700">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" error={errors.name?.message} className="sm:col-span-2">
          <Input {...fieldProps('name', errors.name)} autoComplete="off" placeholder="Dr. Ada Lovelace" {...register('name')} />
        </Field>

        <Field
          label="Specialization"
          htmlFor="specialization"
          error={errors.specialization?.message}
          hint="Patients can only be moved between doctors of the same specialization."
        >
          <Select {...fieldProps('specialization', errors.specialization)} {...register('specialization')}>
            <option value="">Select specialization</option>
            {SPECIALIZATIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>

        <Field label="Hospital" htmlFor="hospital" error={errors.hospital?.message}>
          <Input {...fieldProps('hospital', errors.hospital)} list="hospital-options" autoComplete="off" placeholder="City General Hospital" {...register('hospital')} />
          <datalist id="hospital-options">
            {hospitals.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
        </Field>

        <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
          <Input {...fieldProps('phone', errors.phone)} type="tel" inputMode="tel" autoComplete="off" placeholder="+880 1700 000000" className="font-mono text-sm" {...register('phone')} />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input {...fieldProps('email', errors.email)} type="email" inputMode="email" autoComplete="off" placeholder="doctor@hospital.com" {...register('email')} />
        </Field>
      </div>

      <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
        <Link href={cancelHref} className={buttonVariants({ variant: 'ghost' })}>
          Cancel
        </Link>
        <Button type="submit" loading={busy}>
          {busy ? 'Saving…' : doctor ? 'Save changes' : 'Add doctor'}
        </Button>
      </div>
    </form>
  );
}
