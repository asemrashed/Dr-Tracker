/**
 * Thin fetch wrapper for the REST API.
 * - Same-origin (/api/v1 is proxied to Express by next.config.ts), so the HttpOnly cookie is sent automatically.
 * - Unwraps the { data } envelope and turns every failure into an ApiError.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_PATH = '/api/v1';

interface ApiInit extends Omit<RequestInit, 'body'> {
  /** Serialized as JSON with the right Content-Type. */
  json?: unknown;
}

export async function api<T = void>(path: string, { json, headers, ...init }: ApiInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_PATH}${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', "Can't reach the server. Check your connection and try again.");
  }

  if (res.status === 204) return undefined as T;

  const payload = (await res.json().catch(() => null)) as {
    data?: T;
    error?: { code?: string; message?: string; details?: unknown };
  } | null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      payload?.error?.code ?? 'UNKNOWN_ERROR',
      payload?.error?.message ?? 'Something went wrong. Please try again.',
      payload?.error?.details,
    );
  }

  return payload?.data as T;
}
