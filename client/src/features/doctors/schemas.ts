import { z } from 'zod';
import { SPECIALIZATIONS } from '@/lib/constants';

/** Mirrors the server schema (server/src/modules/doctors/doctor.schema.ts). */
export const doctorFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
  specialization: z.enum(SPECIALIZATIONS, { errorMap: () => ({ message: 'Choose a specialization' }) }),
  hospital: z.string().trim().min(2, 'Hospital must be at least 2 characters').max(120, 'Hospital is too long'),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(120),
});

export type DoctorFormValues = z.infer<typeof doctorFormSchema>;
export const DOCTOR_FIELDS = ['name', 'specialization', 'hospital', 'phone', 'email'] as const;
