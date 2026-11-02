'use client';

import { UserX } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { useDoctor } from '../hooks';
import { DoctorForm } from './doctor-form';

export function EditDoctor({ id }: { id: string }) {
  const { data, isPending, isError, error, refetch, isFetching } = useDoctor(id);

  return (
    <>
      <PageHeader title="Edit doctor" description={data ? data.name : undefined} />
      {isPending && <Skeleton className="h-96 max-w-2xl rounded-card" />}
      {isError && error instanceof ApiError && error.status === 404 && (
        <EmptyState
          icon={UserX}
          title="Doctor not found"
          description="This doctor may have been deleted."
          action={<Link href="/doctors" className={buttonVariants({ variant: 'primary' })}>Back to doctors</Link>}
        />
      )}
      {isError && !(error instanceof ApiError && error.status === 404) && (
        <ErrorState message={error.message} onRetry={() => refetch()} retrying={isFetching} />
      )}
      {data && <DoctorForm doctor={data} />}
    </>
  );
}
