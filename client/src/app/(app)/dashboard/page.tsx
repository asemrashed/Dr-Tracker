import { ChartNoAxesColumn } from 'lucide-react';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Totals, trends and patient distribution at a glance." />
      <EmptyState
        icon={ChartNoAxesColumn}
        title="Analytics are on the way"
        description="Doctor and patient insights will appear here once the data modules are connected."
      />
    </>
  );
}
