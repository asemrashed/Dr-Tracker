'use client';

import { ArrowLeft, Mail, MapPin, Pencil, Phone, Plus, Trash2, UserX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { formatDate, plural } from '@/lib/format';
import { useDoctor } from '../hooks';
import { AddPatientSheet } from './add-patient-sheet';
import { DeleteDoctorDialog } from './delete-doctor-dialog';
import { Badge, DoctorAvatar } from './doctor-bits';
import { DoctorPatients } from './doctor-patients';

export function DoctorDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: doctor, isPending, isError, error, refetch, isFetching } = useDoctor(id);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const back = (
    <Link href="/doctors" className="mb-5 inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm text-ink-muted transition-colors hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden />
      All doctors
    </Link>
  );

  if (isError && error instanceof ApiError && error.status === 404) {
    return (
      <>
        {back}
        <EmptyState
          icon={UserX}
          title="Doctor not found"
          description="This doctor may have been deleted."
          action={<Link href="/doctors" className={buttonVariants({ variant: 'primary' })}>Back to doctors</Link>}
        />
      </>
    );
  }
  if (isError) {
    return (
      <>
        {back}
        <ErrorState message={error.message} onRetry={() => refetch()} retrying={isFetching} />
      </>
    );
  }
  if (isPending) {
    return (
      <>
        {back}
        <div className="rounded-card border border-line bg-surface p-6" role="status" aria-label="Loading doctor">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
          </div>
          <Skeleton className="mt-6 h-4 w-2/3" />
        </div>
      </>
    );
  }

  return (
    <>
      {back}
      <header className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <DoctorAvatar name={doctor.name} className="size-14 text-base" />
            <div className="min-w-0">
              <h1 className="truncate text-[26px] font-semibold leading-tight tracking-tight">{doctor.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <Badge>{doctor.specialization}</Badge>
                <span className="tabular text-[13px] text-ink-muted">{plural(doctor.patientCount ?? 0, 'patient')}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden />
              Add patient
            </Button>
            <Link href={`/doctors/${doctor.id}/edit`} className={buttonVariants({ variant: 'tint' })}>
              <Pencil className="size-4" aria-hidden />
              Edit
            </Link>
            <Button variant="danger" onClick={() => setDeleting(true)}>
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info icon={MapPin} label="Hospital" value={doctor.hospital} />
          <Info icon={Phone} label="Phone" value={doctor.phone} mono />
          <Info icon={Mail} label="Email" value={doctor.email} />
          <div>
            <dt className="text-[13px] text-ink-muted">Added</dt>
            <dd className="mt-0.5">{formatDate(doctor.createdAt)}</dd>
          </div>
        </dl>
      </header>

      <DoctorPatients doctorId={doctor.id} onAdd={() => setAdding(true)} />

      <AddPatientSheet doctorId={doctor.id} doctorName={doctor.name} open={adding} onOpenChange={setAdding} />
      {deleting && <DeleteDoctorDialog doctor={doctor} onClose={() => setDeleting(false)} onDeleted={() => router.replace('/doctors')} />}
    </>
  );
}

function Info({ icon: Icon, label, value, mono }: { icon: typeof Mail; label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[13px] text-ink-muted">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className={`mt-0.5 truncate ${mono ? 'font-mono text-[13px]' : ''}`} title={value}>{value}</dd>
    </div>
  );
}
