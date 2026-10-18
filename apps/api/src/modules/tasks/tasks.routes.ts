import { createTaskSchema, updateTaskSchema } from "@ta/validators";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "@/lib/types";
import { validate } from "@/lib/validate";
import { getActor, getMembership, requireRole } from "@/middleware/auth";

import {
  createTask,
  deleteTask,
  listAssignees,
  listTasks,
  toTaskDto,
  updateTask,
} from "./tasks.service";

const idParam = z.object({ id: z.uuid({ error: "Identificador inválido" }) });

/**
 * /api/v1/tasks — work assigned in the store. The owner and the manager write them;
 * a receiver can mark one done or pending.
 */
export function tasksRoutes(): Hono<AppEnv> {
  const everyone = requireRole("owner", "manager", "receiver");
  const staff = requireRole("owner", "manager");
  return new Hono<AppEnv>()
    .get("/", everyone, async (c) => {
      const rows = await listTasks(c.get("db"), getMembership(c).storeId);
      return c.json({ data: rows.map(toTaskDto) });
    })
    .get("/assignees", staff, async (c) => {
      const rows = await listAssignees(c.get("db"), getMembership(c).storeId);
      return c.json({ data: rows });
    })
    .post("/", staff, validate("json", createTaskSchema), async (c) => {
      const row = await createTask(c.get("db"), getActor(c), c.req.valid("json"));
      return c.json(toTaskDto(row), 201);
    })
    .patch(
      "/:id",
      everyone,
      validate("param", idParam),
      validate("json", updateTaskSchema),
      async (c) => {
        const membership = getMembership(c);
        const row = await updateTask(
          c.get("db"),
          { ...getActor(c), role: membership.role },
          c.req.valid("param").id,
          c.req.valid("json"),
        );
        return c.json(toTaskDto(row));
      },
    )
    .delete("/:id", staff, validate("param", idParam), async (c) => {
      await deleteTask(c.get("db"), getActor(c), c.req.valid("param").id);
      return c.body(null, 204);
    });
}
