import { beforeAll, describe, expect, test } from "bun:test";

import { schema } from "@ta/db";
import { testConnection, uniq } from "@ta/db/testing";
import { staffUserListSchema, staffUserSchema, type StaffUser } from "@ta/validators";
import { verifyPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import { call, errorOf, signInRoles, type Json, type RoleSession } from "@/testing/http";
import { fromWeb, signIn } from "@/testing/test-app";

let s: RoleSession;

// Each password hash/verify (Better Auth's scrypt) takes about a second: tests that create users
// and sign in several times need more than bun's 5 s default.
const SLOW = 30_000;

const newEmail = () => `${uniq("staff")}@test.local`.toLowerCase();

async function create(body: Json = {}): Promise<StaffUser & { password: string }> {
  const password = "clave-inicial-1";
  const res = await call(s.app, "POST", "/users", s.owner, {
    name: "Ana Pérez",
    email: newEmail(),
    password,
    role: "manager",
    ...body,
  });
  if (res.status !== 201) throw new Error(`create: ${JSON.stringify(res.body)}`);
  return { ...staffUserSchema.parse(res.body), password: String(body.password ?? password) };
}

/** POST …/password answers 204 without a body (the JSON helper cannot read it). */
const setPassword = (userId: string, cookie: string, password: string) =>
  s.app.request(
    `/api/v1/users/${userId}/password`,
    {
      method: "POST",
      headers: { ...fromWeb({ "Content-Type": "application/json" }), Cookie: cookie },
      body: JSON.stringify({ password }),
    },
    SLOW,
  );

const meRole = async (cookie: string) => {
  const res = await call(s.app, "GET", "/me", cookie);
  return { status: res.status, body: res.body };
};

beforeAll(async () => {
  s = await signInRoles();
});

describe("GET /api/v1/users", () => {
  test(
    "the store's people, owners first; the signed-in owner is marked; owner only",
    async () => {
      const res = await call(s.app, "GET", "/users", s.owner);

      expect(res.status).toBe(200);
      const list = staffUserListSchema.parse(res.body).data;
      expect(list[0]?.role).toBe("owner");
      expect(list.filter((u) => u.isSelf)).toHaveLength(1);
      expect((await call(s.app, "GET", "/users", s.manager)).status).toBe(403);
      expect((await call(s.app, "GET", "/users", null)).status).toBe(401);
    },
    SLOW,
  );
});

describe("POST /api/v1/users", () => {
  test(
    "creates a manager who signs in with the owner's password and gets their role",
    async () => {
      const user = await create({ email: newEmail(), role: "manager" });

      expect(user).toMatchObject({
        name: "Ana Pérez",
        role: "manager",
        isActive: true,
        isSelf: false,
      });
      const cookie = await signIn(s.app, user.email, user.password);
      const me = await meRole(cookie);
      expect(me.status).toBe(200);
      expect(JSON.stringify(me.body)).toContain('"role":"manager"');
    },
    SLOW,
  );

  test(
    "409 EMAIL_TAKEN on the email field (any case); 400 for an owner or a short password",
    async () => {
      const user = await create();

      const again = await call(s.app, "POST", "/users", s.owner, {
        name: "Otra",
        email: user.email.toUpperCase(),
        password: "clave-inicial-1",
        role: "receiver",
      });
      expect(again.status).toBe(409);
      expect(errorOf(again.body)).toMatchObject({
        code: "EMAIL_TAKEN",
        details: { fieldErrors: { email: ["Ya hay un usuario con ese correo"] } },
      });

      const owner = await call(s.app, "POST", "/users", s.owner, {
        name: "Otro dueño",
        email: newEmail(),
        password: "clave-inicial-1",
        role: "owner",
      });
      expect(owner.status).toBe(400);
      const short = await call(s.app, "POST", "/users", s.owner, {
        name: "Ana",
        email: newEmail(),
        password: "123",
        role: "manager",
      });
      expect(short.status).toBe(400);
      expect((await call(s.app, "POST", "/users", s.manager, { name: "x" })).status).toBe(403);
    },
    SLOW,
  );
});

describe("PATCH /api/v1/users/:id", () => {
  test(
    "changes name and role (receiver → manager)",
    async () => {
      const user = await create({ role: "receiver" });

      const res = await call(s.app, "PATCH", `/users/${user.id}`, s.owner, {
        name: "Ana Receptora",
        role: "manager",
      });

      expect(staffUserSchema.parse(res.body)).toMatchObject({
        name: "Ana Receptora",
        role: "manager",
      });
    },
    SLOW,
  );

  test(
    "deactivating signs the user out at once and blocks the app; activating gives it back",
    async () => {
      const user = await create();
      const cookie = await signIn(s.app, user.email, user.password);
      expect((await call(s.app, "GET", "/shopping-list", cookie)).status).toBe(200);

      await call(s.app, "PATCH", `/users/${user.id}`, s.owner, { isActive: false });

      expect((await meRole(cookie)).status).toBe(401);
      const again = await signIn(s.app, user.email, user.password);
      expect((await call(s.app, "GET", "/shopping-list", again)).status).toBe(403);

      await call(s.app, "PATCH", `/users/${user.id}`, s.owner, { isActive: true });
      expect((await call(s.app, "GET", "/shopping-list", again)).status).toBe(200);
    },
    SLOW,
  );

  test(
    "owners (also yourself) are not changed from here; 404 for someone else's user",
    async () => {
      const list = staffUserListSchema.parse(
        (await call(s.app, "GET", "/users", s.owner)).body,
      ).data;
      const self = list.find((u) => u.isSelf);

      const res = await call(s.app, "PATCH", `/users/${self?.id}`, s.owner, { isActive: false });
      expect(res.status).toBe(422);
      expect(errorOf(res.body).code).toBe("CANNOT_CHANGE_OWNER");
      expect(
        (await call(s.app, "PATCH", `/users/${crypto.randomUUID()}`, s.owner, { name: "X Y" }))
          .status,
      ).toBe(404);
      expect((await call(s.app, "PATCH", `/users/${self?.id}`, s.owner, {})).status).toBe(400);
    },
    SLOW,
  );
});

describe("POST /api/v1/users/:id/password", () => {
  test(
    "the owner sets a new password: the old one stops working, sessions are closed",
    async () => {
      const user = await create();
      const cookie = await signIn(s.app, user.email, user.password);

      const res = await setPassword(user.id, s.owner, "nueva-clave-2");

      expect(res.status).toBe(204);
      expect((await meRole(cookie)).status).toBe(401);
      // The stored hash no longer matches the old password. (Checked on the hash: a failed
      // sign-in followed by another one stalls the single-connection test pool — see CLAUDE.md.)
      const [account] = await testConnection()
        .db.select({ password: schema.accounts.password })
        .from(schema.accounts)
        .where(
          and(eq(schema.accounts.userId, user.id), eq(schema.accounts.providerId, "credential")),
        );
      expect(await verifyPassword({ hash: account!.password!, password: user.password })).toBe(
        false,
      );
      const fresh = await signIn(s.app, user.email, "nueva-clave-2");
      expect((await meRole(fresh)).status).toBe(200);
    },
    SLOW,
  );

  test(
    "400 for a short password, 403 for a manager",
    async () => {
      const user = await create();
      expect(
        (await call(s.app, "POST", `/users/${user.id}/password`, s.owner, { password: "corta" }))
          .status,
      ).toBe(400);
      expect((await setPassword(user.id, s.manager, "otra-clave-1")).status).toBe(403);
    },
    SLOW,
  );
});
