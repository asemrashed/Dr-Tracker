'use client';

import { ChartNoAxesColumn, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUrlParams } from '@/lib/use-url-params';
import { DASHBOARD_RANGES, type DashboardRange } from '../api';
import { useDashboard } from '../hooks';
import { PatientsAreaChart } from './patients-area-chart';
import { RangeToggle } from './range-toggle';
import { RankedBars, type BarRow } from './ranked-bars';
import { StatTile } from './stat-tile';

function Card({ title, subtitle, children, className }: { title: string; subtitle: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-line bg-surface p-5 ${className ?? ''}`}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mb-5 mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>
      {children}
    </section>
  );
}

const Muted = ({ children }: { children: ReactNode }) => (
  <p className="rounded-input bg-canvas px-4 py-8 text-center text-sm text-ink-muted">{children}</p>
);

export function DashboardView() {
  const { searchParams, update } = useUrlParams();
  const raw = Number(searchParams.get('days'));
  const days: DashboardRange = (DASHBOARD_RANGES as readonly number[]).includes(raw) ? (raw as DashboardRange) : 30;

  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useDashboard(days);

  const header = (
    <PageHeader
      title="Dashboard"
      description="Totals, trends and patient distribution at a glance."
      action={<RangeToggle value={days} onChange={(d) => update({ days: d === 30 ? undefined : d })} />}
    />
  );

  if (isError && !data) {
    return (
      <>
        {header}
        <ErrorState title="Couldn't load the dashboard" message={error.message} onRetry={() => refetch()} retrying={isFetching} />
      </>
    );
  }

  if (isPending) {
    return (
      <>
        {header}
        <div role="status" aria-label="Loading dashboard">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[132px] rounded-card" />
            ))}
          </div>
          <Skeleton className="mt-4 h-[380px] rounded-card" />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-[360px] rounded-card" />
            <Skeleton className="h-[360px] rounded-card" />
          </div>
        </div>
      </>
    );
  }

  const { totals } = data;
  if (totals.doctors === 0 && totals.patients === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={ChartNoAxesColumn}
          title="No data to chart yet"
          description="Add a doctor and their patients, and the dashboard fills in automatically."
          action={
            <Link href="/doctors/new" className={buttonVariants({ variant: 'primary' })}>
              <Stethoscope className="size-4" aria-hidden />
              Add doctor
            </Link>
          }
        />
      </>
    );
  }

  const against = `previous ${days} days`;
  const doctorRows: BarRow[] = data.patientsPerDoctor.map((d) => ({
    key: d.doctorId,
    label: d.name,
    sublabel: d.specialization,
    value: d.count,
    href: `/doctors/${d.doctorId}`,
  }));
  if (data.othersCount > 0) doctorRows.push({ key: 'others', label: 'All other doctors', value: data.othersCount, muted: true });

  const conditionRows: BarRow[] = data.conditions.map((c) => ({ key: c.condition, label: c.condition, value: c.count }));

  return (
    <>
      {header}
      {/* Refetch keeps the frame: previous render stays, slightly dimmed. */}
      <div aria-busy={isFetching} className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Active doctors" value={totals.doctors} hint="Currently in the system" />
          <StatTile label="Active patients" value={totals.patients} hint="Across all doctors" />
          <StatTile label={`Patients added, last ${days} days`} value={totals.patientsAdded} delta={{ current: totals.patientsAdded, previous: totals.patientsAddedPrev, against }} />
          <StatTile label={`Doctors added, last ${days} days`} value={totals.doctorsAdded} delta={{ current: totals.doctorsAdded, previous: totals.doctorsAddedPrev, against }} />
        </div>

        <Card className="mt-4" title="Patients added per day" subtitle={`Last ${days} days, days in UTC`}>
          <PatientsAreaChart series={data.series} />
        </Card>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Patients per doctor" subtitle="Top 8 by active patients, right now">
            {doctorRows.length ? <RankedBars rows={doctorRows} unit="patients" /> : <Muted>No patients are assigned to a doctor yet.</Muted>}
          </Card>
          <Card title="Patients by condition" subtitle="All active patients, right now">
            {conditionRows.length ? <RankedBars rows={conditionRows} unit="patients" /> : <Muted>No patients yet.</Muted>}
          </Card>
        </div>
      </div>
    </>
  );
}
