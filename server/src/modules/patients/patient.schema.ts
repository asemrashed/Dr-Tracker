import { z } from 'zod';
import { CONDITIONS, GENDERS } from '../../shared/constants';
import { paginationQuery } from '../../shared/pagination';
import { dateRangeQuery, objectIdSchema, phoneSchema, text } from '../../shared/search';

const patientFields = {
  name: text('Name', 2, 80),
  age: z.coerce
    .number({ invalid_type_error: 'Age must be a number' })
    .int('Age must be a whole number')
    .min(0, 'Age cannot be negative')
    .max(120, 'Age must be 120 or less'),
  gender: z.enum(GENDERS, { errorMap: () => ({ message: 'Choose a gender' }) }),
  phone: phoneSchema,
  condition: z.enum(CONDITIONS, { errorMap: () => ({ message: 'Choose a condition' }) }),
};

export const createPatientSchema = z.object(patientFields);

export const listDoctorPatientsQuery = z.object({
  ...paginationQuery,
  search: z.string().trim().max(80).optional(),
});

export const updatePatientSchema = z
  .object({ ...patientFields, doctorId: objectIdSchema })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

export const listPatientsQuery = z.object({
  ...paginationQuery,
  search: z.string().trim().max(80).optional(),
  condition: z.enum(CONDITIONS).optional(),
  gender: z.enum(GENDERS).optional(),
  doctorId: objectIdSchema.optional(),
  sort: z.enum(['name', 'age', 'condition', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  ...dateRangeQuery,
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type ListDoctorPatientsQuery = z.infer<typeof listDoctorPatientsQuery>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuery>;
