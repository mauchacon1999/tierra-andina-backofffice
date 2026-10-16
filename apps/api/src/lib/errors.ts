import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * Controlled application error. The global error handler turns it into
 * `{ error: { code, message, details? } }` with the given HTTP status (default 400).
 */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: ContentfulStatusCode = 400,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DB_UNAVAILABLE: "DB_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
