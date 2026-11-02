/**
 * Shared constants. This file is the source of truth: client/src/lib/constants.ts mirrors
 * the lists below, keep both in sync.
 */

export const USER_ROLES = ['admin', 'doctor', 'patient'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Roles that may sign in today. Doctor and patient accounts exist (seeded) so the
 * role structure is real, but their portals are not built yet.
 * Enabling a new portal later = add the role here and protect its routes with requireRole().
 */
export const LOGIN_ENABLED_ROLES: readonly UserRole[] = ['admin'];

export const AUTH_COOKIE_NAME = 'dt_token';

/** Fixed list so "same specialization" matching for patient reassignment is reliable. */
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

export const PAGINATION = { defaultLimit: 10, maxLimit: 50 } as const;
