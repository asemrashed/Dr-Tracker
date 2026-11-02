/** Mirror of server/src/shared/constants.ts (the source of truth). Keep both in sync. */
export const SPECIALIZATIONS = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'ENT',
  'Gastroenterology',
  'General Medicine',
  'Gynecology',
  'Neurology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Radiology',
  'Urology',
] as const;
export type Specialization = (typeof SPECIALIZATIONS)[number];

export const CONDITIONS = [
  'Allergy',
  'Anxiety',
  'Arthritis',
  'Asthma',
  'Back pain',
  'Diabetes',
  'Heart disease',
  'Hypertension',
  'Infection',
  'Migraine',
  'Other',
] as const;
export type Condition = (typeof CONDITIONS)[number];

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export const PAGE_SIZE = 10;
