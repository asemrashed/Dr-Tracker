/**
 * Shared constants.
 * Specialization and condition lists will be added with the Doctors/Patients modules.
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
