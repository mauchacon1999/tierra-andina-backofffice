import { z } from "zod";

/**
 * Formato único de error de la API: { error: { code, message, details? } }.
 * Lo produce apps/api y lo consume apps/web.
 */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
