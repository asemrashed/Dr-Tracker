'use client';

import { Search, Trash2, Users } from 'lucide-react';
import { memo, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { Patient } from '@/features/patients/api';
import { formatDate } from '@/lib/format';
import { useUrlParams } from '@/lib/use-url-params';
import { useUrlSearch } from '@/lib/use-url-search';
import { useDeletePatient } from '@/features/patients/hooks';
import { useDoctorPatients } from '../hooks';
import { Badge } from './doctor-bits';

/** Paginated patients of one doctor. Search and page live in the URL. */
export function DoctorPatients({ doctorId, onAdd }: { doctorId: string; onAdd: () => void }) {
  const { searchParams, update } = useUrlParams();
  const search = useUrlSearch('search');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const params = { page, search: search.value || undefined };

  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useDoctorPatients(doctorId, params);
  const [toDelete, setToDelete] = useState<Patient | null>(null);
  const del = useDeletePatient();

  const empty = !isPending && !isError && data?.items.length === 0;

  return (
    <section aria-labelledby="patients-heading" className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <h2 id="patients-heading" className="text-lg font-semibold">
          Patients{data ? <span className="tabular ml-2 font-normal text-ink-muted">{data.meta.total}</span> : null}
        </h2>
        <div className="w-full sm:w-72">
          <Label htmlFor="patient-search" className="sr-only">Search patients by name</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <Input id="patient-search" type="search" value={search.text} onChange={(e) => search.onChange(e.target.value)} placeholder="Search patients…" autoComplete="off" className="pl-10" />
          </div>
        </div>
      </div>

      {isError && !data ? (
        <ErrorState message={error.message} onRetry={() => refetch()} retrying={isFetching} />
      ) : empty ? (
        <EmptyState
          icon={Users}
          title={search.value ? 'No patients match your search' : 'No patients yet'}
          description={search.value ? 'Try a different name.' : 'Add the first patient to this doctor.'}
          action={search.value ? undefined : <Button onClick={onAdd}>Add patient</Button>}
        />
      ) : (
        <div aria-busy={isFetching} className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="hidden overflow-x-auto rounded-card border border-line bg-surface md:block">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <caption className="sr-only">Patients of this doctor</caption>
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-[13px] font-medium text-ink-muted">
                  <th scope="col" className="px-4 py-3">Patient</th>
                  <th scope="col" className="px-4 py-3 text-right">Age</th>
                  <th scope="col" className="px-4 py-3">Gender</th>
                  <th scope="col" className="px-4 py-3">Phone</th>
                  <th scope="col" className="px-4 py-3">Condition</th>
                  <th scope="col" className="px-4 py-3">Added</th>
                  <th scope="col" className="w-14 px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {isPending
                  ? Array.from({ length: 5 }, (_, i) => (
                      <tr key={i} className="border-b border-line last:border-0" aria-hidden>
                        {Array.from({ length: 7 }, (_, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full max-w-28" /></td>
                        ))}
                      </tr>
                    ))
                  : data?.items.map((p) => <PatientRow key={p.id} patient={p} onDelete={setToDelete} />)}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden" aria-label="Patients of this doctor">
            {isPending
              ? Array.from({ length: 3 }, (_, i) => (
                  <li key={i} className="rounded-card border border-line bg-surface p-4"><Skeleton className="h-10 w-full" /></li>
                ))
              : data?.items.map((p) => (
                  <li key={p.id} className="rounded-card border border-line bg-surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="tabular text-[13px] capitalize text-ink-muted">{p.age} · {p.gender}</p>
                      </div>
                      <DeleteButton patient={p} onDelete={setToDelete} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-muted">
                      <Badge>{p.condition}</Badge>
                      <span className="font-mono">{p.phone}</span>
                    </div>
                  </li>
                ))}
          </ul>

          {data && <Pagination meta={data.meta} noun="patient" onPageChange={(n) => update({ page: n })} disabled={isPlaceholderData} />}
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setToDelete(null)}
          title={`Delete ${toDelete.name}?`}
          description="The patient is removed from this doctor, the patients list and analytics."
          confirmLabel="Delete patient"
          loading={del.isPending}
          onConfirm={() => del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        />
      )}
    </section>
  );
}

const PatientRow = memo(function PatientRow({ patient: p, onDelete }: { patient: Patient; onDelete: (p: Patient) => void }) {
  return (
    <tr className="border-b border-line last:border-0 hover:bg-primary-50/40">
      <td className="max-w-[220px] truncate px-4 py-3 font-medium">{p.name}</td>
      <td className="tabular px-4 py-3 text-right font-mono text-[13px]">{p.age}</td>
      <td className="px-4 py-3 capitalize text-ink-muted">{p.gender}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-ink-muted">{p.phone}</td>
      <td className="px-4 py-3"><Badge>{p.condition}</Badge></td>
      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDate(p.createdAt)}</td>
      <td className="px-4 py-3"><DeleteButton patient={p} onDelete={onDelete} /></td>
    </tr>
  );
});

function DeleteButton({ patient, onDelete }: { patient: Patient; onDelete: (p: Patient) => void }) {
  return (
    <button
      type="button"
      onClick={() => onDelete(patient)}
      aria-label={`Delete ${patient.name}`}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-50 hover:text-danger-700 md:size-9"
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}
