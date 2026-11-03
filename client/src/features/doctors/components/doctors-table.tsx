'use client';

import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';
import { SortButton } from '@/components/shared/sort-button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Doctor, DoctorSort } from '../api';
import { Badge, DoctorAvatar } from './doctor-bits';

interface Props {
  items: Doctor[] | undefined;
  loading: boolean;
  sort: DoctorSort;
  order: 'asc' | 'desc';
  onSort: (key: DoctorSort) => void;
  onDelete: (doctor: Doctor) => void;
}

const COLUMNS: { key: DoctorSort | null; label: string; className?: string }[] = [
  { key: 'name', label: 'Doctor' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'hospital', label: 'Hospital' },
  { key: null, label: 'Phone' },
  { key: null, label: 'Patients', className: 'text-right' },
  { key: 'createdAt', label: 'Added' },
];

export function DoctorsTable({ items, loading, sort, order, onSort, onDelete }: Props) {
  return (
    <>
      {/* Desktop / tablet: table */}
      <div className="hidden overflow-x-auto rounded-card border border-line bg-surface md:block">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <caption className="sr-only">Doctors</caption>
          <thead>
            <tr className="border-b border-line bg-canvas/60">
              {COLUMNS.map((col) => (
                <th
                  key={col.label}
                  scope="col"
                  aria-sort={col.key && sort === col.key ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn('px-4 py-3 text-[13px] font-medium text-ink-muted', col.className)}
                >
                  {col.key ? (
                    <SortButton
                      label={col.label}
                      active={sort === col.key}
                      order={order}
                      onClick={() => onSort(col.key as DoctorSort)}
                    />
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              <th scope="col" className="w-24 px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)
              : items?.map((d) => <DoctorRow key={d.id} doctor={d} onDelete={onDelete} />)}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <ul className="space-y-3 md:hidden" aria-label="Doctors">
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="rounded-card border border-line bg-surface p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="mt-3 h-4 w-2/3" />
              </li>
            ))
          : items?.map((d) => <DoctorCard key={d.id} doctor={d} onDelete={onDelete} />)}
      </ul>
    </>
  );
}

const DoctorRow = memo(function DoctorRow({ doctor: d, onDelete }: { doctor: Doctor; onDelete: (d: Doctor) => void }) {
  return (
    <tr className="border-b border-line transition-colors last:border-0 hover:bg-primary-50/40">
      <td className="max-w-[280px] px-4 py-3">
        <Link href={`/doctors/${d.id}`} className="group flex items-center gap-3 rounded-input">
          <DoctorAvatar name={d.name} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink group-hover:text-primary-700">{d.name}</span>
            <span className="block truncate text-[13px] text-ink-muted">{d.email}</span>
          </span>
        </Link>
      </td>
      <td className="px-4 py-3">
        <Badge>{d.specialization}</Badge>
      </td>
      <td className="max-w-[200px] truncate px-4 py-3 text-ink-muted">{d.hospital}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-ink-muted">{d.phone}</td>
      <td className="tabular px-4 py-3 text-right font-mono text-[13px]">{d.patientCount ?? 0}</td>
      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDate(d.createdAt)}</td>
      <td className="px-4 py-3">
        <RowActions doctor={d} onDelete={onDelete} />
      </td>
    </tr>
  );
});

const DoctorCard = memo(function DoctorCard({ doctor: d, onDelete }: { doctor: Doctor; onDelete: (d: Doctor) => void }) {
  return (
    <li className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/doctors/${d.id}`} className="flex min-w-0 items-center gap-3">
          <DoctorAvatar name={d.name} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{d.name}</span>
            <span className="block truncate text-[13px] text-ink-muted">{d.hospital}</span>
          </span>
        </Link>
        <RowActions doctor={d} onDelete={onDelete} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-muted">
        <Badge>{d.specialization}</Badge>
        <span className="tabular">
          <span className="font-mono text-ink">{d.patientCount ?? 0}</span> patients
        </span>
        <span className="font-mono">{d.phone}</span>
      </div>
    </li>
  );
});

function RowActions({ doctor, onDelete }: { doctor: Doctor; onDelete: (d: Doctor) => void }) {
  return (
    <div className="flex shrink-0 items-center justify-end">
      <Link
        href={`/doctors/${doctor.id}/edit`}
        aria-label={`Edit ${doctor.name}`}
        className="flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink md:size-9"
      >
        <Pencil className="size-4" aria-hidden />
      </Link>
      <button
        type="button"
        onClick={() => onDelete(doctor)}
        aria-label={`Delete ${doctor.name}`}
        className="flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-50 hover:text-danger-700 md:size-9"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-line last:border-0" aria-hidden>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
      <td className="px-4 py-3"><Skeleton className="ml-auto h-4 w-6" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="ml-auto h-8 w-16 rounded-full" /></td>
    </tr>
  );
}
