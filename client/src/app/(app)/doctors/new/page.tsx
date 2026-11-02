import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { DoctorForm } from '@/features/doctors/components/doctor-form';

export const metadata: Metadata = { title: 'Add doctor' };

export default async function NewDoctorPage({ searchParams }: { searchParams: Promise<{ specialization?: string }> }) {
  const { specialization } = await searchParams;
  return (
    <>
      <PageHeader title="Add doctor" description="Create a doctor profile. Specialization decides who can take over their patients." />
      <DoctorForm defaultSpecialization={specialization} />
    </>
  );
}
