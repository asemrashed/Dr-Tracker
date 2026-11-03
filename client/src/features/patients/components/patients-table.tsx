'use client';

import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';
import { SortButton } from '@/components/shared/sort-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/features/doctors/components/doctor-bits';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Patient, PatientSort } from '../api';

interface Props {
  items: Patient[] | undefined;
  loading: boolean;
  sort: PatientSort;
  order: 'asc' | 'desc';
  onSort: (key: PatientSort) => void;
  onEdit: (p: Patient) => void;
  onDelete: (p: Patient) => void;
}

const COLUMNS: { key: PatientSort | null; label: string; className?: string }[] = [
  { key: 'name', label: 'Patient' },
  { key: 'age', label: 'Age', className: 'text-right' },
  { key: null, label: 'Gender' },
  { key: 'condition', label: 'Condition' },
  { key: null, label: 'Doctor' },
  { key: 'createdAt', label: 'Added' },
];

export function PatientsTable({ items, loading, sort, order, onSort, onEdit, onDelete }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-card border border-line bg-surface md:block">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <caption className="sr-only">Patients</caption>
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
                    <SortButton label={col.label} active={sort === col.key} order={order} onClick={() => onSort(col.key as PatientSort)} />
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              <th scope="col" className="w-24 px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} className="border-b border-line last:border-0" aria-hidden>
                    {Array.from({ length: 7 }, (_, j) => (
                      <td key={j} className="px-4 py-3.5"><Skeleton className="h-4 w-full max-w-28" /></td>
                    ))}
                  </tr>
                ))
              : items?.map((p) => <PatientRow key={p.id} patient={p} onEdit={onEdit} onDelete={onDelete} />)}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden" aria-label="Patients">
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="rounded-card border border-line bg-surface p-4"><Skeleton className="h-10 w-full" /></li>
            ))
          : items?.map((p) => <PatientCard key={p.id} patient={p} onEdit={onEdit} onDelete={onDelete} />)}
      </ul>
    </>
  );
}

type RowProps = { patient: Patient; onEdit: (p: Patient) => void; onDelete: (p: Patient) => void };

const DoctorLink = ({ patient }: { patient: Patient }) =>
  patient.doctor ? (
    <Link href={`/doctors/${patient.doctor.id}`} className="group block min-w-0 rounded-input">
      <span className="block truncate group-hover:text-primary-700">{patient.doctor.name}</span>
      <span className="block truncate text-[13px] text-ink-muted">{patient.doctor.specialization}</span>
    </Link>
  ) : (
    <span className="text-ink-muted">Unassigned</span>
  );

const PatientRow = memo(function PatientRow({ patient: p, onEdit, onDelete }: RowProps) {
  return (
    <tr className="border-b border-line transition-colors last:border-0 hover:bg-primary-50/40">
      <td className="max-w-[240px] px-4 py-3">
        <span className="block truncate font-medium">{p.name}</span>
        <span className="block font-mono text-[13px] text-ink-muted">{p.phone}</span>
      </td>
      <td className="tabular px-4 py-3 text-right font-mono text-[13px]">{p.age}</td>
      <td className="px-4 py-3 capitalize text-ink-muted">{p.gender}</td>
      <td className="px-4 py-3"><Badge>{p.condition}</Badge></td>
      <td className="max-w-[220px] px-4 py-3"><DoctorLink patient={p} /></td>
      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDate(p.createdAt)}</td>
      <td className="px-4 py-3"><RowActions patient={p} onEdit={onEdit} onDelete={onDelete} /></td>
    </tr>
  );
});

const PatientCard = memo(function PatientCard({ patient: p, onEdit, onDelete }: RowProps) {
  return (
    <li className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{p.name}</p>
          <p className="tabular text-[13px] capitalize text-ink-muted">{p.age} · {p.gender}</p>
        </div>
        <RowActions patient={p} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-muted">
        <Badge>{p.condition}</Badge>
        <span className="font-mono">{p.phone}</span>
      </div>
      <div className="mt-3 border-t border-line pt-3 text-[13px]"><DoctorLink patient={p} /></div>
    </li>
  );
});

function RowActions({ patient, onEdit, onDelete }: RowProps) {
  const base = 'flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors md:size-9';
  return (
    <div className="flex shrink-0 items-center justify-end">
      <button type="button" onClick={() => onEdit(patient)} aria-label={`Edit ${patient.name}`} className={cn(base, 'hover:bg-ink/5 hover:text-ink')}>
        <Pencil className="size-4" aria-hidden />
      </button>
      <button type="button" onClick={() => onDelete(patient)} aria-label={`Delete ${patient.name}`} className={cn(base, 'hover:bg-danger-50 hover:text-danger-700')}>
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}
