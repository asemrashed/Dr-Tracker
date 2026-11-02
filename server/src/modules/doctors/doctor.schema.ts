import { z } from 'zod';
import { SPECIALIZATIONS } from '../../shared/constants';
import { paginationQuery } from '../../shared/pagination';
import { dateRangeQuery, objectIdSchema, phoneSchema, text } from '../../shared/search';

const doctorFields = {
  name: text('Name', 2, 80),
  specialization: z.enum(SPECIALIZATIONS, { errorMap: () => ({ message: 'Choose a specialization' }) }),
  hospital: text('Hospital', 2, 120),
  phone: phoneSchema,
  email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email').max(120),
};

export const createDoctorSchema = z.object(doctorFields);
export const updateDoctorSchema = z
  .object(doctorFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

export const listDoctorsQuery = z.object({
  ...paginationQuery,
  search: z.string().trim().max(80).optional(),
  specialization: z.enum(SPECIALIZATIONS).optional(),
  hospital: z.string().trim().max(120).optional(),
  sort: z.enum(['name', 'specialization', 'hospital', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  ...dateRangeQuery,
});

export const reassignBodySchema = z.object({ targetDoctorId: objectIdSchema });

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuery>;
