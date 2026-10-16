import { Hono } from "hono";

import type { AppEnv } from "@/lib/types";

/** /api/v1 router. Business modules (src/modules/*) get mounted here; empty for now. */
export function v1Routes(): Hono<AppEnv> {
  return new Hono<AppEnv>();
}
