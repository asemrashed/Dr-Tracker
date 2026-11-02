import { Users } from 'lucide-react';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Patients' };

export default function PatientsPage() {
  return (
    <>
      <PageHeader title="Patients" description="Search, filter and update patient records." />
      <EmptyState
        icon={Users}
        title="Patients module coming soon"
        description="The patients list, filters and editing arrive after the doctors module."
      />
    </>
  );
}
