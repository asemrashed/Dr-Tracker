import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DoctorsList } from '@/features/doctors/components/doctors-list';

export const metadata: Metadata = { title: 'Doctors' };

// useSearchParams() (filters live in the URL) requires a Suspense boundary.
export default function DoctorsPage() {
  return (
    <Suspense>
      <DoctorsList />
    </Suspense>
  );
}
