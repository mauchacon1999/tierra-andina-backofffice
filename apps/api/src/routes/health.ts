import { Hono } from "hono";

import { describeError } from "@/lib/describe-error";
import { AppError, ErrorCode } from "@/lib/errors";
import type { AppEnv } from "@/lib/types";
import { withTimeout } from "@/lib/with-timeout";

export type HealthDeps = {
  version: string;
  pingDb: () => Promise<void>;
  dbTimeoutMs?: number;
};

/** GET /health (liveness) and GET /health/db (database check, 503 when it does not answer). */
export function healthRoutes({ version, pingDb, dbTimeoutMs = 3000 }: HealthDeps): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .get("/", (c) => c.json({ ok: true as const, version }))
    .get("/db", async (c) => {
      try {
        await withTimeout(pingDb(), dbTimeoutMs, "database ping");
      } catch (cause) {
        console.error(`[${c.get("requestId")}] /health/db failed: ${describeError(cause)}`);
        throw new AppError(ErrorCode.DB_UNAVAILABLE, "La base de datos no responde", 503);
      }
      return c.json({ ok: true as const, db: "up" as const });
    });
}
