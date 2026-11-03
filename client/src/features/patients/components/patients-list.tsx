'use client';

import { SearchX, Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { useClampPage } from '@/lib/use-clamp-page';
import { useUrlParams } from '@/lib/use-url-params';
import { useUrlSearch } from '@/lib/use-url-search';
import type { Patient, PatientListParams, PatientSort } from '../api';
import { useDeletePatient, useDoctorOptions, usePatients } from '../hooks';
import { EditPatientSheet } from './edit-patient-sheet';
import { PatientsFilters } from './patients-filters';
import { PatientsTable } from './patients-table';

const SORTS: readonly PatientSort[] = ['name', 'age', 'condition', 'createdAt'];

export function PatientsList() {
  const { searchParams, update, clear } = useUrlParams();
  const search = useUrlSearch('search');
  const doctors = useDoctorOptions();
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const del = useDeletePatient();

  const sortParam = searchParams.get('sort');
  const sort: PatientSort = SORTS.includes(sortParam as PatientSort) ? (sortParam as PatientSort) : 'createdAt';
  const order = (searchParams.get('order') ?? (sort === 'createdAt' ? 'desc' : 'asc')) === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const condition = searchParams.get('condition') ?? '';
  const gender = searchParams.get('gender') ?? '';
  const doctorId = searchParams.get('doctorId') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const params = useMemo<PatientListParams>(
    () => ({
      page,
      sort,
      order,
      search: search.value || undefined,
      condition: condition || undefined,
      gender: gender || undefined,
      doctorId: doctorId || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [page, sort, order, search.value, condition, gender, doctorId, from, to],
  );

  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = usePatients(params);
  useClampPage(data?.meta, page, !isPlaceholderData, update);
  const activeCount = [search.value, condition, gender, doctorId, from, to].filter(Boolean).length;

  const onSort = (key: PatientSort) => {
    if (key === sort) update({ sort: key, order: order === 'asc' ? 'desc' : 'asc' });
    else update({ sort: key, order: key === 'createdAt' ? 'desc' : 'asc' });
  };
  const clearAll = () => {
    search.reset();
    clear();
  };

  const noResults = !isPending && !isError && data?.items.length === 0 && page <= data.meta.totalPages;

  return (
    <>
      <PageHeader title="Patients" description="Search, filter and manage every patient across all doctors." />

      <PatientsFilters
        search={search.text}
        onSearch={search.onChange}
        condition={condition}
        gender={gender}
        doctorId={doctorId}
        from={from}
        to={to}
        doctors={doctors.data ?? []}
        onChange={update}
        activeCount={activeCount}
        onClear={clearAll}
      />

      {isError && !data ? (
        <ErrorState message={error.message} onRetry={() => refetch()} retrying={isFetching} />
      ) : noResults ? (
        activeCount > 0 ? (
          <EmptyState
            icon={SearchX}
            title="No patients match these filters"
            description="Try a different search or widen the date range."
            action={<Button variant="tint" onClick={clearAll}>Clear filters</Button>}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="No patients yet"
            description="Patients are added from a doctor's page, so start by choosing a doctor."
            action={
              <Link href="/doctors" className={buttonVariants({ variant: 'primary' })}>
                <Stethoscope className="size-4" aria-hidden />
                Go to doctors
              </Link>
            }
          />
        )
      ) : (
        <div aria-busy={isFetching} className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <PatientsTable items={data?.items} loading={isPending} sort={sort} order={order} onSort={onSort} onEdit={setEditing} onDelete={setDeleting} />
          {data && <Pagination meta={data.meta} noun="patient" onPageChange={(p) => update({ page: p })} disabled={isPlaceholderData} />}
        </div>
      )}

      {isError && data && (
        <p role="alert" className="mt-3 text-sm text-danger-700">Couldn&apos;t refresh: {error.message}</p>
      )}

      {editing && <EditPatientSheet key={editing.id} patient={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          title={`Delete ${deleting.name}?`}
          description="The patient is removed from the list, from their doctor and from analytics."
          confirmLabel="Delete patient"
          loading={del.isPending}
          onConfirm={() =>
            del.mutate(deleting.id, {
              onSuccess: () => setDeleting(null),
              onError: (e) => {
                toast.error(e.message);
                setDeleting(null);
              },
            })
          }
        />
      )}
    </>
  );
}
