import { beforeAll, describe, expect, test } from "bun:test";

import {
  staffUserListSchema,
  taskAssigneeListSchema,
  taskListSchema,
  taskSchema,
} from "@ta/validators";

import { call, errorOf, signInRoles, type Json, type RoleSession } from "@/testing/http";

let s: RoleSession;
let managerId: string;
let receiverId: string;

beforeAll(async () => {
  s = await signInRoles();
  const people = staffUserListSchema.parse((await call(s.app, "GET", "/users", s.owner)).body).data;
  const manager = people.find((person) => person.role === "manager" && person.isActive);
  const receiver = people.find((person) => person.role === "receiver" && person.isActive);
  if (!manager || !receiver) throw new Error("seeded staff missing");
  managerId = manager.id;
  receiverId = receiver.id;
});

const create = (cookie: string, body: Json) => call(s.app, "POST", "/tasks", cookie, body);

describe("tasks", () => {
  test("the owner assigns a task and the list shows it pending", async () => {
    const created = await create(s.owner, {
      title: "  Comprar bolsas  ",
      description: "  las grandes  ",
      assigneeId: managerId,
    });

    expect(created.status).toBe(201);
    const task = taskSchema.parse(created.body);
    expect(task).toMatchObject({
      title: "Comprar bolsas",
      description: "las grandes",
      assigneeId: managerId,
      status: "pending",
      isHighPriority: false,
    });
    expect(task.assigneeName.length).toBeGreaterThan(0);

    const list = taskListSchema.parse((await call(s.app, "GET", "/tasks", s.manager)).body);
    expect(list.data.some((row) => row.id === task.id)).toBe(true);
  });

  test("high priority is flagged, finishing it stays assigned, and a receiver cannot rewrite it", async () => {
    const created = taskSchema.parse(
      (await create(s.manager, { title: "Llamar al puesto", assigneeId: receiverId })).body,
    );

    const flagged = taskSchema.parse(
      (await call(s.app, "PATCH", `/tasks/${created.id}`, s.owner, { isHighPriority: true })).body,
    );
    expect(flagged.isHighPriority).toBe(true);

    const finished = taskSchema.parse(
      (await call(s.app, "PATCH", `/tasks/${created.id}`, s.receiver, { status: "done" })).body,
    );
    expect(finished).toMatchObject({
      status: "done",
      isHighPriority: true,
      assigneeId: receiverId,
    });

    const rewritten = await call(s.app, "PATCH", `/tasks/${created.id}`, s.receiver, {
      title: "Otra cosa",
    });
    expect(rewritten.status).toBe(403);
    expect(errorOf(rewritten.body).code).toBe("FORBIDDEN");
  });

  test("the owner sets it in progress and reassigns it; a receiver can only change the status", async () => {
    const created = taskSchema.parse(
      (await create(s.owner, { title: "Revisar la nevera", assigneeId: managerId })).body,
    );

    const moved = taskSchema.parse(
      (
        await call(s.app, "PATCH", `/tasks/${created.id}`, s.owner, {
          status: "in_progress",
          assigneeId: receiverId,
        })
      ).body,
    );
    expect(moved).toMatchObject({ status: "in_progress", assigneeId: receiverId });

    const noted = taskSchema.parse(
      (await call(s.app, "PATCH", `/tasks/${created.id}`, s.receiver, { status: "observation" }))
        .body,
    );
    expect(noted).toMatchObject({ status: "observation", assigneeId: receiverId });

    const reassigned = await call(s.app, "PATCH", `/tasks/${created.id}`, s.receiver, {
      assigneeId: managerId,
    });
    expect(reassigned.status).toBe(403);
    expect(errorOf(reassigned.body).code).toBe("FORBIDDEN");
  });

  test("unknown assignee is 422, a missing task is 404, and a receiver cannot create one", async () => {
    const unknown = await create(s.owner, { title: "Nadie", assigneeId: crypto.randomUUID() });
    expect(unknown.status).toBe(422);
    expect(errorOf(unknown.body).code).toBe("ASSIGNEE_NOT_FOUND");

    const missing = await call(s.app, "PATCH", `/tasks/${crypto.randomUUID()}`, s.owner, {
      status: "done",
    });
    expect(missing.status).toBe(404);
    expect(errorOf(missing.body).code).toBe("TASK_NOT_FOUND");

    expect((await create(s.receiver, { title: "No puedo", assigneeId: managerId })).status).toBe(
      403,
    );
    expect((await call(s.app, "GET", "/tasks", null)).status).toBe(401);
  });

  test("the owner deletes a task; a receiver cannot", async () => {
    const created = taskSchema.parse(
      (await create(s.owner, { title: "Barrer la entrada", assigneeId: managerId })).body,
    );

    expect((await call(s.app, "DELETE", `/tasks/${created.id}`, s.receiver)).status).toBe(403);
    expect((await call(s.app, "DELETE", `/tasks/${created.id}`, s.owner)).status).toBe(204);
    const list = taskListSchema.parse((await call(s.app, "GET", "/tasks", s.owner)).body);
    expect(list.data.some((row) => row.id === created.id)).toBe(false);
    expect((await call(s.app, "DELETE", `/tasks/${created.id}`, s.owner)).status).toBe(404);
  });

  test("assignees are the active people of the store", async () => {
    const list = taskAssigneeListSchema.parse(
      (await call(s.app, "GET", "/tasks/assignees", s.manager)).body,
    );
    expect(list.data.map((person) => person.id)).toContain(managerId);
    expect((await call(s.app, "GET", "/tasks/assignees", s.receiver)).status).toBe(403);
  });
});
