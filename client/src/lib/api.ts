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

interface Envelope<T, M> {
  data?: T;
  meta?: M;
  error?: { code?: string; message?: string; details?: unknown };
}

async function request<T, M = never>(
  path: string,
  { json, headers, ...init }: ApiInit = {},
): Promise<Envelope<T, M> | null> {
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

  if (res.status === 204) return null;

  const payload = (await res.json().catch(() => null)) as Envelope<T, M> | null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      payload?.error?.code ?? 'UNKNOWN_ERROR',
      payload?.error?.message ?? 'Something went wrong. Please try again.',
      payload?.error?.details,
    );
  }
  return payload;
}

/** Single-resource call: returns the unwrapped `data`. */
export async function api<T = void>(path: string, init: ApiInit = {}): Promise<T> {
  const payload = await request<T>(path, init);
  return payload?.data as T;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

/** List call: returns the items together with the pagination meta. */
export async function apiPage<T>(path: string, init: ApiInit = {}): Promise<Page<T>> {
  const payload = await request<T[], PageMeta>(path, init);
  return { items: payload?.data ?? [], meta: payload?.meta as PageMeta };
}

/** Build a query string, skipping empty values. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const out = sp.toString();
  return out ? `?${out}` : '';
}
