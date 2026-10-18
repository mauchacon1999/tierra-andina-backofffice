import { schema } from "@ta/db";
import { and, eq } from "drizzle-orm";
import { testConnection } from "@ta/db/testing";

import { TEST_OWNER } from "@/testing/preload";
import {
  createStore,
  createTestApp,
  createUser,
  fromWeb,
  signIn,
  type TestApp,
} from "@/testing/test-app";

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
/**
 * Owner, manager and receiver of a new store. Trip tests use this so each file can keep
 * its own single open trip without closing another file's.
 */
export async function signInOwnStore(): Promise<RoleSession> {
  const app = createTestApp();
  const store = await createStore();
  const owner = await createUser({ storeId: store.id, role: "owner" });
  const manager = await createUser({ storeId: store.id, role: "manager" });
  const receiver = await createUser({ storeId: store.id, role: "receiver" });
  return {
    app,
    storeId: store.id,
    owner: await signIn(app, owner.email, owner.password),
    manager: await signIn(app, manager.email, manager.password),
    receiver: await signIn(app, receiver.email, receiver.password),
  };
}

/** Closes every open trip of a store directly, so a test can open the next one. */
export async function closeOpenTrips(storeId: string): Promise<void> {
  await testConnection()
    .db.update(schema.purchaseTrips)
    .set({ status: "closed" })
    .where(and(eq(schema.purchaseTrips.storeId, storeId), eq(schema.purchaseTrips.status, "open")));
}

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
  if (res.status === 204) return { status: res.status, body: {} };
  return { status: res.status, body: (await res.json()) as Json };
}

export const errorOf = (body: Json): { code: string; message: string; details?: Json } =>
  body.error as { code: string; message: string; details?: Json };
