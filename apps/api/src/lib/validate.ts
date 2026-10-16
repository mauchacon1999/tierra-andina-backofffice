import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { z } from "zod";

import { ApiError, ErrorCode } from "./errors";

/**
 * Envoltorio de zValidator: si la validación falla, lanza ApiError para que la respuesta
 * salga con el formato único de error. Uso: route.post("/", validate("json", schema), handler)
 */
export const validate = <Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new ApiError(
        400,
        ErrorCode.VALIDATION_ERROR,
        "Los datos enviados no son válidos",
        z.flattenError(result.error),
      );
    }
  });
