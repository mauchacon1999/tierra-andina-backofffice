import { z } from "zod";

/**
 * Unified API error shape: { error: { code, message, details? } }.
 * Produced by apps/api and consumed by apps/web.
 */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
