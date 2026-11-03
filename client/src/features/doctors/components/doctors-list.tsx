'use client';

import { Plus, SearchX, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Button, buttonVariants } from '@/components/ui/button';
import { useClampPage } from '@/lib/use-clamp-page';
import { useUrlParams } from '@/lib/use-url-params';
import { useUrlSearch } from '@/lib/use-url-search';
import type { Doctor, DoctorListParams, DoctorSort } from '../api';
import { useDoctorMeta, useDoctors } from '../hooks';
import { DeleteDoctorDialog } from './delete-doctor-dialog';
import { DoctorsFilters } from './doctors-filters';
import { DoctorsTable } from './doctors-table';

const SORTS: readonly DoctorSort[] = ['name', 'specialization', 'hospital', 'createdAt'];

export function DoctorsList() {
  const { searchParams, update, clear } = useUrlParams();
  const search = useUrlSearch('search');
  const [toDelete, setToDelete] = useState<Doctor | null>(null);
  const meta = useDoctorMeta();

  const sortParam = searchParams.get('sort');
  const sort: DoctorSort = SORTS.includes(sortParam as DoctorSort) ? (sortParam as DoctorSort) : 'createdAt';
  const order = (searchParams.get('order') ?? (sort === 'createdAt' ? 'desc' : 'asc')) === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const specialization = searchParams.get('specialization') ?? '';
  const hospital = searchParams.get('hospital') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const params = useMemo<DoctorListParams>(
    () => ({
      page,
      sort,
      order,
      search: search.value || undefined,
      specialization: specialization || undefined,
      hospital: hospital || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [page, sort, order, search.value, specialization, hospital, from, to],
  );

  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useDoctors(params);

  useClampPage(data?.meta, page, !isPlaceholderData, update);
  const activeCount = [search.value, specialization, hospital, from, to].filter(Boolean).length;

  const onSort = (key: DoctorSort) => {
    if (key === sort) update({ sort: key, order: order === 'asc' ? 'desc' : 'asc' });
    else update({ sort: key, order: key === 'createdAt' ? 'desc' : 'asc' });
  };

  const clearAll = () => {
    search.reset();
    clear();
  };

  const addButton = (
    <Link href="/doctors/new" className={buttonVariants({ variant: 'primary' })}>
      <Plus className="size-4" aria-hidden />
      Add doctor
    </Link>
  );

  // An empty page past the end is handled by useClampPage, so don't flash "no results" meanwhile.
  const noResults = !isPending && !isError && data?.items.length === 0 && page <= data.meta.totalPages;

  return (
    <>
      <PageHeader title="Doctors" description="Create, search and manage doctors and their patients." action={addButton} />

      <DoctorsFilters
        search={search.text}
        onSearch={search.onChange}
        specialization={specialization}
        hospital={hospital}
        from={from}
        to={to}
        hospitals={meta.data?.hospitals ?? []}
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
            title="No doctors match these filters"
            description="Try a different search or widen the date range."
            action={
              <Button variant="tint" onClick={clearAll}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Stethoscope}
            title="No doctors yet"
            description="Add your first doctor to start assigning patients."
            action={addButton}
          />
        )
      ) : (
        <div aria-busy={isFetching} className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <DoctorsTable items={data?.items} loading={isPending} sort={sort} order={order} onSort={onSort} onDelete={setToDelete} />
          {data && <Pagination meta={data.meta} noun="doctor" onPageChange={(p) => update({ page: p })} disabled={isPlaceholderData} />}
        </div>
      )}

      {isError && data && (
        <p role="alert" className="mt-3 text-sm text-danger-700">
          Couldn&apos;t refresh: {error.message}
        </p>
      )}

      {toDelete && <DeleteDoctorDialog key={toDelete.id} doctor={toDelete} onClose={() => setToDelete(null)} />}
    </>
  );
}
