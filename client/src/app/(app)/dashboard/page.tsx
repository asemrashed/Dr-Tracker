import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DashboardView } from '@/features/dashboard/components/dashboard-view';

export const metadata: Metadata = { title: 'Dashboard' };

// useSearchParams() (the selected range lives in the URL) requires a Suspense boundary.
export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}
