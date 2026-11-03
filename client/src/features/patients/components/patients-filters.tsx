'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { CONDITIONS, GENDERS } from '@/lib/constants';
import type { DoctorRef } from '../api';

interface Props {
  search: string;
  onSearch: (value: string) => void;
  condition: string;
  gender: string;
  doctorId: string;
  from: string;
  to: string;
  doctors: DoctorRef[];
  onChange: (patch: Record<string, string | undefined>) => void;
  activeCount: number;
  onClear: () => void;
}

export function PatientsFilters({ search, onSearch, condition, gender, doctorId, from, to, doctors, onChange, activeCount, onClear }: Props) {
  return (
    <form role="search" aria-label="Filter patients" onSubmit={(e) => e.preventDefault()} className="mb-5 rounded-card border border-line bg-surface p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2">
          <Label htmlFor="patient-search">Search by name</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <Input id="patient-search" type="search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Starts with…" autoComplete="off" className="pl-10" />
          </div>
        </div>
        <div>
          <Label htmlFor="filter-condition">Condition</Label>
          <Select id="filter-condition" value={condition} onChange={(e) => onChange({ condition: e.target.value || undefined })}>
            <option value="">All</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="filter-gender">Gender</Label>
          <Select id="filter-gender" value={gender} onChange={(e) => onChange({ gender: e.target.value || undefined })}>
            <option value="">All</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g[0]?.toUpperCase() + g.slice(1)}</option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="filter-doctor">Doctor</Label>
          <Select id="filter-doctor" value={doctorId} onChange={(e) => onChange({ doctorId: e.target.value || undefined })}>
            <option value="">All doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name} · {d.specialization}</option>
            ))}
            {/* A doctorId from the URL stays selectable before the options load. */}
            {doctorId && !doctors.some((d) => d.id === doctorId) && <option value={doctorId}>Selected doctor</option>}
          </Select>
        </div>
        <div className="lg:col-span-1">
          <Label htmlFor="pfilter-from">Added from</Label>
          <Input id="pfilter-from" type="date" value={from} max={to || undefined} onChange={(e) => onChange({ from: e.target.value || undefined })} />
        </div>
        <div className="lg:col-span-1">
          <Label htmlFor="pfilter-to">Added to</Label>
          <Input id="pfilter-to" type="date" value={to} min={from || undefined} onChange={(e) => onChange({ to: e.target.value || undefined })} />
        </div>
      </div>
      {activeCount > 0 && (
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <X className="size-4" aria-hidden />
            Clear {activeCount === 1 ? 'filter' : `${activeCount} filters`}
          </Button>
        </div>
      )}
    </form>
  );
}
