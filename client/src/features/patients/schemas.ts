import { z } from 'zod';
import { CONDITIONS, GENDERS } from '@/lib/constants';

const PHONE = /^\+?[0-9 ()-]{7,20}$/;

/** Mirrors the server schema (server/src/modules/patients/patient.schema.ts). */
export const patientFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
  age: z
    .string()
    .trim()
    .min(1, 'Age is required')
    .refine((v) => /^\d+$/.test(v), 'Age must be a whole number')
    .refine((v) => Number(v) <= 120, 'Age must be 120 or less'),
  gender: z.enum(GENDERS, { errorMap: () => ({ message: 'Choose a gender' }) }),
  phone: z.string().trim().regex(PHONE, 'Enter a valid phone number'),
  condition: z.enum(CONDITIONS, { errorMap: () => ({ message: 'Choose a condition' }) }),
  /** Only used when editing (reassign). The add-patient form leaves it out. */
  doctorId: z.string().optional(),
});

export const patientEditSchema = patientFormSchema.extend({ doctorId: z.string().min(1, 'Choose a doctor') });

export type PatientFormValues = z.infer<typeof patientFormSchema>;
export const PATIENT_FIELDS = ['name', 'age', 'gender', 'phone', 'condition', 'doctorId'] as const;
