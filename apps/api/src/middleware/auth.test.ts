import { beforeAll, describe, expect, test } from "bun:test";

import { schema } from "@ta/db";
import { testConnection } from "@ta/db/testing";
import { Hono } from "hono";

import { createAuth } from "@/lib/auth";
import type { AppEnv } from "@/lib/types";
import { getActor, requireRole, sessionMiddleware } from "@/middleware/auth";
import { errorHandler } from "@/middleware/errors";
import {
  createStore,
  createTestApp,
  createUser,
  signIn,
  TEST_WEB_ORIGIN,
  type TestApp,
} from "@/testing/test-app";

/*
 * requireRole on a throwaway route (/guarded) wired like the real app: the same Better Auth
 * instance signs users in (through the real app) and resolves sessions.
 */

let app: TestApp;
let guarded: Hono<AppEnv>;

beforeAll(() => {
  app = createTestApp();
  const { db } = testConnection();
  const auth = createAuth({
    db,
    secret: "test-only-secret-that-is-at-least-32-characters-long",
    baseUrl: "http://localhost:4000",
    webOrigin: TEST_WEB_ORIGIN,
  });
  guarded = new Hono<AppEnv>()
    .use(async (c, next) => {
      c.set("db", db);
      c.set("auth", auth);
      await next();
    })
    .use(sessionMiddleware)
    .get("/guarded", requireRole("owner", "manager"), (c) => c.json(getActor(c)))
    .onError(errorHandler);
});

async function callAs(cookie: string | null, storeId?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers.Cookie = cookie;
  if (storeId) headers["X-Store-Id"] = storeId;
  const res = await guarded.request("/guarded", { headers });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const errorCode = (body: Record<string, unknown>) => (body.error as { code: string }).code;

describe("requireRole('owner', 'manager')", () => {
  test("401 without a session", async () => {
    const { status, body } = await callAs(null);

    expect(status).toBe(401);
    expect(errorCode(body)).toBe("UNAUTHENTICATED");
  });

  test("allows a manager of their only store and exposes the actor", async () => {
    const store = await createStore();
    const user = await createUser({ storeId: store.id, role: "manager" });

    const { status, body } = await callAs(await signIn(app, user.email, user.password));

    expect(status).toBe(200);
    expect(body).toEqual({ userId: user.id, storeId: store.id });
  });

  test("403 FORBIDDEN for a role that is not allowed (receiver)", async () => {
    const store = await createStore();
    const user = await createUser({ storeId: store.id, role: "receiver" });

    const { status, body } = await callAs(await signIn(app, user.email, user.password));

    expect(status).toBe(403);
    expect(body.error).toEqual({
      code: "FORBIDDEN",
      message: "No tienes permiso para esta acción",
    });
  });

  test("403 FORBIDDEN for a user without memberships", async () => {
    const user = await createUser();

    const { status, body } = await callAs(await signIn(app, user.email, user.password));

    expect(status).toBe(403);
    expect(errorCode(body)).toBe("FORBIDDEN");
  });

  test("403 FORBIDDEN when the membership is inactive", async () => {
    const store = await createStore();
    const user = await createUser({ storeId: store.id, role: "owner", isActive: false });

    const { status } = await callAs(await signIn(app, user.email, user.password));

    expect(status).toBe(403);
  });

  test("400 STORE_REQUIRED with several stores and no X-Store-Id", async () => {
    const first = await createStore();
    const second = await createStore();
    const user = await createUser({ storeId: first.id, role: "owner" });
    await testConnection()
      .db.insert(schema.memberships)
      .values({ userId: user.id, storeId: second.id, role: "manager" });
    const cookie = await signIn(app, user.email, user.password);

    const withoutHeader = await callAs(cookie);
    const withHeader = await callAs(cookie, second.id);

    expect(withoutHeader.status).toBe(400);
    expect(errorCode(withoutHeader.body)).toBe("STORE_REQUIRED");
    expect(withHeader.status).toBe(200);
    expect(withHeader.body).toEqual({ userId: user.id, storeId: second.id });
  });

  test("403 when X-Store-Id names a store the user does not belong to", async () => {
    const mine = await createStore();
    const other = await createStore();
    const user = await createUser({ storeId: mine.id, role: "owner" });

    const { status, body } = await callAs(await signIn(app, user.email, user.password), other.id);

    expect(status).toBe(403);
    expect(body.error).toEqual({ code: "FORBIDDEN", message: "No tienes acceso a esta tienda" });
  });
});
