import {
  createStaffUserSchema,
  setUserPasswordSchema,
  updateStaffUserSchema,
} from "@ta/validators";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "@/lib/types";
import { validate } from "@/lib/validate";
import { getActor, getMembership, requireRole } from "@/middleware/auth";

import {
  createStaffUser,
  listUsers,
  setUserPassword,
  toStaffUserDto,
  updateStaffUser,
} from "./users.service";

const userParam = z.object({ id: z.uuid({ error: "Identificador inválido" }) });

/** /api/v1/users — the store's people (owner only). */
export function usersRoutes(): Hono<AppEnv> {
  const owner = requireRole("owner");
  return new Hono<AppEnv>()
    .get("/", owner, async (c) => {
      const actor = getActor(c);
      const rows = await listUsers(c.get("db"), getMembership(c).storeId);
      return c.json({ data: rows.map((row) => toStaffUserDto(row, actor)) });
    })
    .post("/", owner, validate("json", createStaffUserSchema), async (c) => {
      const actor = getActor(c);
      const row = await createStaffUser(c.get("db"), actor, c.req.valid("json"));
      return c.json(toStaffUserDto(row, actor), 201);
    })
    .patch(
      "/:id",
      owner,
      validate("param", userParam),
      validate("json", updateStaffUserSchema),
      async (c) => {
        const actor = getActor(c);
        const row = await updateStaffUser(
          c.get("db"),
          actor,
          c.req.valid("param").id,
          c.req.valid("json"),
        );
        return c.json(toStaffUserDto(row, actor));
      },
    )
    .post(
      "/:id/password",
      owner,
      validate("param", userParam),
      validate("json", setUserPasswordSchema),
      async (c) => {
        await setUserPassword(
          c.get("db"),
          getActor(c),
          c.req.valid("param").id,
          c.req.valid("json"),
        );
        return c.body(null, 204);
      },
    );
}
