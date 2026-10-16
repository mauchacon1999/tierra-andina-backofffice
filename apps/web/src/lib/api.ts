import { apiErrorSchema } from "@ta/validators";
import { z } from "zod";

import { publicEnv } from "@/lib/env";

/** Codes produced by this client; every other code comes from the API (NOT_FOUND, DB_UNAVAILABLE…). */
export type ClientErrorCode = "NETWORK_ERROR" | "TIMEOUT" | "INVALID_RESPONSE";

export type ApiErrorInit = {
  /** HTTP status; 0 when there was no response (network down or timeout). */
  status: number;
  code: ClientErrorCode | (string & {});
  /** Spanish, safe to show to users. */
  message: string;
  details?: unknown;
  requestId?: string | undefined;
};

/** Typed error thrown by every API call. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorInit["code"];
  readonly details: unknown;
  readonly requestId: string | undefined;

  constructor({ status, code, message, details, requestId }: ApiErrorInit) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  /** True when the API never answered. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export type RequestOptions<T> = Omit<RequestInit, "body"> & {
  /** Serialized as JSON. */
  body?: unknown;
  /** When given, the response is validated with Zod and typed accordingly. */
  schema?: z.ZodType<T>;
  timeoutMs?: number;
};

/** Calls the API. Resolves with the (validated) JSON body or throws ApiError. */
export async function apiFetch<T>(
  path: string,
  { body, schema, timeoutMs = 8000, headers, signal, ...init }: RequestOptions<T> = {},
): Promise<T> {
  const url = new URL(path, publicEnv.NEXT_PUBLIC_API_URL);
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (body !== undefined) requestHeaders.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      credentials: "include",
      ...init,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });
  } catch (cause) {
    const timedOut = timeoutSignal.aborted;
    throw new ApiError({
      status: 0,
      code: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
      message: timedOut
        ? `La API no respondió en ${timeoutMs} ms`
        : "No se pudo conectar con la API",
      details: cause instanceof Error ? cause.message : cause,
    });
  }

  const requestId = response.headers.get("x-request-id") ?? undefined;
  const data: unknown =
    response.status === 204 ? undefined : await response.json().catch(() => undefined);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(data);
    if (parsed.success) {
      throw new ApiError({ status: response.status, ...parsed.data.error, requestId });
    }
    throw new ApiError({
      status: response.status,
      code: "INVALID_RESPONSE",
      message: `Respuesta inesperada de la API (HTTP ${response.status})`,
      details: data,
      requestId,
    });
  }

  // Without a schema the caller vouches for the shape (trusted boundary).
  if (!schema) return data as T;

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError({
      status: response.status,
      code: "INVALID_RESPONSE",
      message: "La respuesta de la API no tiene el formato esperado",
      details: z.flattenError(parsed.error),
      requestId,
    });
  }
  return parsed.data;
}

type MethodOptions<T> = Omit<RequestOptions<T>, "method">;

export const api = {
  get: <T>(path: string, options?: MethodOptions<T>): Promise<T> =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: MethodOptions<T>): Promise<T> =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: MethodOptions<T>): Promise<T> =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: MethodOptions<T>): Promise<T> =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: MethodOptions<T>): Promise<T> =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
