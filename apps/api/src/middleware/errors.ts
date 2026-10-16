import type { ApiErrorBody } from "@ta/validators";
import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";

import { AppError, ErrorCode } from "@/lib/errors";
import type { AppEnv } from "@/lib/types";

function body(code: string, message: string, details?: unknown): ApiErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

/** Turns any error into the unified shape { error: { code, message, details? } }. */
export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof AppError) {
    return c.json(body(err.code, err.message, err.details), err.httpStatus);
  }

  if (err instanceof HTTPException) {
    return c.json(body(`HTTP_${err.status}`, err.message || "Error HTTP"), err.status);
  }

  // Unknown errors never leak their message to the client.
  console.error(`[${c.get("requestId")}] Unhandled error:`, err);
  return c.json(body(ErrorCode.INTERNAL_ERROR, "Error interno del servidor"), 500);
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) =>
  c.json(body(ErrorCode.NOT_FOUND, `Ruta no encontrada: ${c.req.method} ${c.req.path}`), 404);
