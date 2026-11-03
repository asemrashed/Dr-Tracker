import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PatientsList } from '@/features/patients/components/patients-list';

export const metadata: Metadata = { title: 'Patients' };

// useSearchParams() (filters live in the URL) requires a Suspense boundary.
export default function PatientsPage() {
  return (
    <Suspense>
      <PatientsList />
    </Suspense>
  );
}
