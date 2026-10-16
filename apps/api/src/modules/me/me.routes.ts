import type { MeResponse } from "@ta/validators";
import { Hono } from "hono";

import { findActiveMemberships } from "@/lib/memberships";
import type { AppEnv } from "@/lib/types";
import { requireAuth } from "@/middleware/auth";

/** GET /api/v1/me — the signed-in user and the stores (with role) they can act in. */
export function meRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>().get("/", requireAuth, async (c) => {
    const user = c.get("user");
    if (!user) throw new Error("requireAuth guarantees a user");

    const memberships = await findActiveMemberships(c.get("db"), user.id);
    const body = {
      user: { id: user.id, name: user.name, email: user.email },
      memberships,
    } satisfies MeResponse;
    return c.json(body);
  });
}
