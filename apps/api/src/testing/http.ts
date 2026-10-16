import { schema } from "@ta/db";
import { testConnection } from "@ta/db/testing";

import { TEST_OWNER } from "@/testing/preload";
import { createTestApp, createUser, fromWeb, signIn, type TestApp } from "@/testing/test-app";

/*
 * Shared helpers for module integration tests: an app, cookies for each role in the seeded
 * store, and a JSON request helper.
 */

export type Json = Record<string, unknown>;
export type CallResult = { status: number; body: Json };

export type RoleSession = {
  app: TestApp;
  storeId: string;
  owner: string;
  manager: string;
  receiver: string;
};

/** Signs in the seeded owner plus a new manager and receiver of the seeded store. */
export async function signInRoles(): Promise<RoleSession> {
  const app = createTestApp();
  const [store] = await testConnection().db.select().from(schema.stores).limit(1);
  if (!store) throw new Error("seeded store missing");
  const manager = await createUser({ storeId: store.id, role: "manager" });
  const receiver = await createUser({ storeId: store.id, role: "receiver" });
  return {
    app,
    storeId: store.id,
    owner: await signIn(app, TEST_OWNER.ownerEmail, TEST_OWNER.ownerPassword),
    manager: await signIn(app, manager.email, manager.password),
    receiver: await signIn(app, receiver.email, receiver.password),
  };
}

/** JSON request to /api/v1 with an optional session cookie. */
export async function call(
  app: TestApp,
  method: string,
  path: string,
  cookie: string | null,
  body?: unknown,
): Promise<CallResult> {
  const headers: Record<string, string> = fromWeb();
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await app.request(`/api/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Json };
}

export const errorOf = (body: Json): { code: string; message: string; details?: Json } =>
  body.error as { code: string; message: string; details?: Json };
