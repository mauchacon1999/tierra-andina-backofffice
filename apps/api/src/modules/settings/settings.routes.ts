import { updateStoreSettingsSchema } from "@ta/validators";
import { Hono } from "hono";

import type { AppEnv } from "@/lib/types";
import { validate } from "@/lib/validate";
import { getActor, getMembership, requireRole } from "@/middleware/auth";

import { getStoreSettings, updateStoreSettings } from "./settings.service";

/** /api/v1/settings — read by every role (rounding, defaults); written by the owner. */
export function settingsRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .get("/", requireRole("owner", "manager", "receiver"), async (c) =>
      c.json(await getStoreSettings(c.get("db"), getMembership(c).storeId)),
    )
    .patch("/", requireRole("owner"), validate("json", updateStoreSettingsSchema), async (c) =>
      c.json(await updateStoreSettings(c.get("db"), getActor(c), c.req.valid("json"))),
    );
}
