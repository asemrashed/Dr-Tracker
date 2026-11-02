import { Stethoscope } from 'lucide-react';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Doctors' };

export default function DoctorsPage() {
  return (
    <>
      <PageHeader title="Doctors" description="Create, search and manage doctors and their patients." />
      <EmptyState
        icon={Stethoscope}
        title="Doctors module coming next"
        description="The doctors list, filters and patient management land in the next phase."
      />
    </>
  );
}
