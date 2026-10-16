import { Hono } from "hono";

import type { AppEnv } from "@/lib/types";
import { sessionMiddleware } from "@/middleware/auth";
import { meRoutes } from "@/modules/me/me.routes";

/** /api/v1 router: every request gets `user`/`session`; modules decide what they require. */
export function v1Routes(): Hono<AppEnv> {
  return new Hono<AppEnv>().use(sessionMiddleware).route("/me", meRoutes());
}
