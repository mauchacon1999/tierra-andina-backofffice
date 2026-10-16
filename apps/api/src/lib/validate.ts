import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { z } from "zod";

import { AppError, ErrorCode } from "./errors";

/**
 * zValidator wrapper: on failure it throws AppError so the response uses the unified error
 * shape instead of zValidator's own. Usage: route.post("/", validate("json", schema), handler)
 *
 * The return type is intentionally inferred: it carries the input/output types that make
 * `c.req.valid(target)` typed in the handler, and spelling it out would duplicate zValidator's
 * generic signature.
 */
export const validate = <Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        "Los datos enviados no son válidos",
        400,
        z.flattenError(result.error),
      );
    }
  });
