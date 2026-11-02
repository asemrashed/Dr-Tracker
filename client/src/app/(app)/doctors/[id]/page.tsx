import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DoctorDetail } from '@/features/doctors/components/doctor-detail';

export const metadata: Metadata = { title: 'Doctor' };

export default async function DoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <DoctorDetail id={id} />
    </Suspense>
  );
}
