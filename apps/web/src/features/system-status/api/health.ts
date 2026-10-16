import { z } from "zod";

import { api } from "@/lib/api";

const healthSchema = z.object({ ok: z.literal(true), version: z.string() });
const dbHealthSchema = z.object({ ok: z.literal(true), db: z.literal("up") });

export type Health = z.infer<typeof healthSchema>;
export type DbHealth = z.infer<typeof dbHealthSchema>;

/** GET /health — API liveness and version. */
export function getHealth(): Promise<Health> {
  return api.get("/health", { schema: healthSchema, timeoutMs: 5000 });
}

/** GET /health/db — throws ApiError (503 DB_UNAVAILABLE) when the database does not answer. */
export function getDbHealth(): Promise<DbHealth> {
  return api.get("/health/db", { schema: dbHealthSchema, timeoutMs: 5000 });
}
