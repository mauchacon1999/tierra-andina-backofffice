import { schema } from "@ta/db";
import { testConnection, uniq } from "@ta/db/testing";
import type { MembershipRole } from "@ta/validators";
import { hashPassword } from "better-auth/crypto";
import type { Hono } from "hono";

import { createApp } from "@/app";
import { createAuth } from "@/lib/auth";
import type { AppEnv } from "@/lib/types";

/*
 * API integration test helpers: the real app (Better Auth included) on DATABASE_URL_TEST.
 * The preload resets and seeds that database once per run.
 */

export const TEST_WEB_ORIGIN = "http://localhost:3000";
const TEST_SECRET = "test-only-secret-that-is-at-least-32-characters-long";

export type TestApp = Hono<AppEnv>;

/** The app wired to the test database. `pingDb` can be replaced to simulate an outage. */
export function createTestApp(
  overrides: {
    pingDb?: () => Promise<void>;
    officialBcvRate?: () => Promise<{ usd: string; effectiveDate: string }>;
  } = {},
): TestApp {
  const { db, ping } = testConnection();
  const auth = createAuth({
    db,
    secret: TEST_SECRET,
    baseUrl: "http://localhost:4000",
    webOrigin: TEST_WEB_ORIGIN,
  });
  return createApp({
    webOrigin: TEST_WEB_ORIGIN,
    pingDb: overrides.pingDb ?? ping,
    db,
    auth,
    logRequests: false,
    officialBcvRate:
      overrides.officialBcvRate ?? (async () => ({ usd: "880.1159", effectiveDate: "2026-10-16" })),
  });
}

/** Headers of a browser request coming from the web app. */
export function fromWeb(extra: Record<string, string> = {}): Record<string, string> {
  return { Origin: TEST_WEB_ORIGIN, ...extra };
}

/** Signs in through Better Auth and returns the `Cookie` header for later requests. */
export async function signIn(app: TestApp, email: string, password: string): Promise<string> {
  const res = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: fromWeb({ "Content-Type": "application/json" }),
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) throw new Error(`sign-in failed (${res.status}): ${await res.text()}`);
  const cookies = res.headers.getSetCookie().map((c) => c.split(";")[0]);
  if (cookies.length === 0) throw new Error("sign-in returned no cookie");
  return cookies.join("; ");
}

export type TestUser = { id: string; email: string; password: string };

/**
 * Creates a user with an email/password account and (optionally) a membership.
 * Rows are committed: Better Auth uses its own queries, so tests cannot roll them back.
 * Emails are unique per call, and the test database is reset on every run.
 */
export async function createUser(
  options: { storeId?: string; role?: MembershipRole; isActive?: boolean } = {},
): Promise<TestUser> {
  const { db } = testConnection();
  const email = `${uniq("user")}@test.local`;
  const password = "test-password-123";

  const [user] = await db
    .insert(schema.users)
    .values({ name: "Test user", email, emailVerified: true })
    .returning();
  if (!user) throw new Error("could not create user");
  await db.insert(schema.accounts).values({
    accountId: user.id,
    providerId: "credential",
    userId: user.id,
    password: await hashPassword(password),
  });
  if (options.storeId && options.role) {
    await db.insert(schema.memberships).values({
      userId: user.id,
      storeId: options.storeId,
      role: options.role,
      isActive: options.isActive ?? true,
    });
  }
  return { id: user.id, email, password };
}

/** Creates an extra store (committed). */
export async function createStore(name = uniq("Store")): Promise<{ id: string; name: string }> {
  const [store] = await testConnection().db.insert(schema.stores).values({ name }).returning();
  if (!store) throw new Error("could not create store");
  return { id: store.id, name: store.name };
}
