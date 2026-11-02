import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api';

/** Props every form control needs to wire up its inline error for assistive tech. */
export const fieldProps = (id: string, error?: { message?: string }) => ({
  id,
  'aria-invalid': error ? (true as const) : undefined,
  'aria-describedby': error ? `${id}-error` : undefined,
});

/**
 * Show server-side field errors (400 VALIDATION_ERROR, 409 EMAIL_TAKEN) next to the matching input.
 * Returns true if at least one field error was applied.
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly string[]) {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return false;
  let applied = false;
  for (const d of error.details as { field?: string; message?: string }[]) {
    if (d.field && d.message && fields.includes(d.field)) {
      setError(d.field as Path<T>, { type: 'server', message: d.message });
      applied = true;
    }
  }
  return applied;
}
