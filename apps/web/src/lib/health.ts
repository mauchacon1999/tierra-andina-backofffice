import { z } from "zod";

import { api } from "./api";

const healthSchema = z.object({ ok: z.literal(true), version: z.string() });
const dbHealthSchema = z.object({ ok: z.literal(true), db: z.literal("up") });

export type Health = z.infer<typeof healthSchema>;
export type DbHealth = z.infer<typeof dbHealthSchema>;

export const getHealth = () => api.get("/health", { schema: healthSchema, timeoutMs: 5000 });
export const getDbHealth = () => api.get("/health/db", { schema: dbHealthSchema, timeoutMs: 5000 });
