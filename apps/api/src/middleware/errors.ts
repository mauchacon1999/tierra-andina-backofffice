import type { ApiErrorBody } from "@ta/validators";
import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";

import { AppError, ErrorCode } from "../lib/errors";
import type { AppEnv } from "../lib/types";

function body(code: string, message: string, details?: unknown): ApiErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

/** Convierte cualquier error al formato único { error: { code, message, details? } }. */
export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof AppError) {
    return c.json(body(err.code, err.message, err.details), err.status);
  }

  if (err instanceof HTTPException) {
    return c.json(body(`HTTP_${err.status}`, err.message || "Error HTTP"), err.status);
  }

  console.error(`[${c.get("requestId")}] Error no controlado:`, err);
  return c.json(body(ErrorCode.INTERNAL_ERROR, "Error interno del servidor"), 500);
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) =>
  c.json(body(ErrorCode.NOT_FOUND, `Ruta no encontrada: ${c.req.method} ${c.req.path}`), 404);
