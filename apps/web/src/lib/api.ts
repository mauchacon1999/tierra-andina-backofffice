import { apiErrorSchema } from "@ta/validators";
import { z } from "zod";

import { publicEnv } from "./env";

/** Códigos que genera el propio cliente; el resto viene de la API (NOT_FOUND, DB_UNAVAILABLE…). */
export type ClientErrorCode = "NETWORK_ERROR" | "TIMEOUT" | "INVALID_RESPONSE";

export interface ApiErrorInit {
  /** Status HTTP; 0 si no hubo respuesta (red caída o timeout). */
  status: number;
  code: ClientErrorCode | (string & {});
  message: string;
  details?: unknown;
  requestId?: string | undefined;
}

/** Error tipado de toda llamada a la API. */
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

  /** true si la API no llegó a responder. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export interface RequestOptions<T> extends Omit<RequestInit, "body"> {
  /** Se serializa como JSON. */
  body?: unknown;
  /** Si se pasa, la respuesta se valida con Zod y queda tipada. */
  schema?: z.ZodType<T>;
  timeoutMs?: number;
}

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
  get: <T>(path: string, options?: MethodOptions<T>) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: MethodOptions<T>) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: MethodOptions<T>) =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: MethodOptions<T>) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: MethodOptions<T>) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
