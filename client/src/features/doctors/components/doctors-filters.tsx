'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { SPECIALIZATIONS } from '@/lib/constants';

interface Props {
  search: string;
  onSearch: (value: string) => void;
  specialization: string;
  hospital: string;
  from: string;
  to: string;
  hospitals: string[];
  onChange: (patch: Record<string, string | undefined>) => void;
  activeCount: number;
  onClear: () => void;
}

export function DoctorsFilters({ search, onSearch, specialization, hospital, from, to, hospitals, onChange, activeCount, onClear }: Props) {
  return (
    <form role="search" aria-label="Filter doctors" onSubmit={(e) => e.preventDefault()} className="mb-5 rounded-card border border-line bg-surface p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2 lg:col-span-2">
          <Label htmlFor="doctor-search">Search by name</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <Input
              id="doctor-search"
              type="search"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Starts with…"
              autoComplete="off"
              className="pl-10"
            />
          </div>
        </div>
        <div className="lg:col-span-1">
          <Label htmlFor="filter-specialization">Specialization</Label>
          <Select id="filter-specialization" value={specialization} onChange={(e) => onChange({ specialization: e.target.value || undefined })}>
            <option value="">All</option>
            {SPECIALIZATIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div className="lg:col-span-1">
          <Label htmlFor="filter-hospital">Hospital</Label>
          <Select id="filter-hospital" value={hospital} onChange={(e) => onChange({ hospital: e.target.value || undefined })}>
            <option value="">All</option>
            {hospitals.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
            {/* Keep a hospital from the URL selectable even if the list has not loaded yet. */}
            {hospital && !hospitals.includes(hospital) && <option value={hospital}>{hospital}</option>}
          </Select>
        </div>
        <div>
          <Label htmlFor="filter-from">Added from</Label>
          <Input id="filter-from" type="date" value={from} max={to || undefined} onChange={(e) => onChange({ from: e.target.value || undefined })} />
        </div>
        <div>
          <Label htmlFor="filter-to">Added to</Label>
          <Input id="filter-to" type="date" value={to} min={from || undefined} onChange={(e) => onChange({ to: e.target.value || undefined })} />
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
