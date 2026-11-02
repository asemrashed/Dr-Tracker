import type { Metadata } from 'next';
import { EditDoctor } from '@/features/doctors/components/edit-doctor';

export const metadata: Metadata = { title: 'Edit doctor' };

export default async function EditDoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditDoctor id={id} />;
}
