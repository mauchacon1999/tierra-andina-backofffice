import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Error HTTP controlado que el manejador global convierte al formato único. */
export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const ErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DB_UNAVAILABLE: "DB_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
