import { beforeAll, describe, expect, test } from "bun:test";

import { schema } from "@ta/db";
import { testConnection } from "@ta/db/testing";
import { meResponseSchema } from "@ta/validators";

import {
  createStore,
  createTestApp,
  createUser,
  fromWeb,
  signIn,
  type TestApp,
} from "@/testing/test-app";
import { TEST_OWNER } from "@/testing/preload";

let app: TestApp;

beforeAll(() => {
  app = createTestApp();
});

const signInRequest = (email: string, password: string) =>
  app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: fromWeb({ "Content-Type": "application/json" }),
    body: JSON.stringify({ email, password }),
  });

describe("POST /api/auth/sign-in/email", () => {
  test("signs the seeded owner in and sets an httpOnly session cookie", async () => {
    const res = await signInRequest(TEST_OWNER.ownerEmail, TEST_OWNER.ownerPassword);

    expect(res.status).toBe(200);
    const cookie = res.headers.getSetCookie().join("\n");
    expect(cookie).toContain("session_token=");
    expect(cookie.toLowerCase()).toContain("httponly");
  });

  test("rejects a wrong password in the unified error format, in Spanish", async () => {
    const res = await signInRequest(TEST_OWNER.ownerEmail, "wrong-password");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "INVALID_EMAIL_OR_PASSWORD", message: "Correo o contraseña incorrectos" },
    });
  });

  test("rejects a sign-in coming from another origin (CSRF protection)", async () => {
    const res = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { Origin: "http://evil.example", "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_OWNER.ownerEmail,
        password: TEST_OWNER.ownerPassword,
      }),
    });

    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("INVALID_ORIGIN");
  });

  test("rejects an unknown email the same way (no account enumeration)", async () => {
    const res = await signInRequest("nobody@test.local", "whatever-123");

    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "INVALID_EMAIL_OR_PASSWORD",
    );
  });
});

describe("POST /api/auth/sign-up/email", () => {
  test("is disabled: users are created by the owner, not by signing up", async () => {
    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: fromWeb({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name: "Intruso", email: "x@test.local", password: "password-123" }),
    });
    const body = (await res.json()) as { error: { code: string; message: string } };

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("EMAIL_PASSWORD_SIGN_UP_DISABLED");
    expect(body.error.message).toBe("El registro está deshabilitado");
  });
});

describe("GET /api/v1/me", () => {
  test("returns 401 UNAUTHENTICATED without a session", async () => {
    const res = await app.request("/api/v1/me");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "UNAUTHENTICATED", message: "Inicia sesión para continuar" },
    });
  });

  test("returns 401 with an invalid session cookie", async () => {
    const res = await app.request("/api/v1/me", {
      headers: { Cookie: "better-auth.session_token=forged.value" },
    });

    expect(res.status).toBe(401);
  });

  test("returns the owner and the seeded store with role owner", async () => {
    const cookie = await signIn(app, TEST_OWNER.ownerEmail, TEST_OWNER.ownerPassword);

    const res = await app.request("/api/v1/me", { headers: { Cookie: cookie } });
    const body = meResponseSchema.parse(await res.json());

    expect(res.status).toBe(200);
    expect(body.user.email).toBe(TEST_OWNER.ownerEmail);
    expect(body.memberships).toEqual([
      {
        storeId: expect.any(String),
        storeName: "Tierra Andina — Mercado AVEPAC, Caricuao",
        role: "owner",
      },
    ]);
  });

  test("lists only active memberships", async () => {
    const active = await createStore("A store");
    const inactive = await createStore("B store");
    const user = await createUser({ storeId: active.id, role: "manager" });
    await createUser(); // unrelated user
    await testConnection()
      .db.insert(schema.memberships)
      .values({ userId: user.id, storeId: inactive.id, role: "receiver", isActive: false });

    const cookie = await signIn(app, user.email, user.password);
    const res = await app.request("/api/v1/me", { headers: { Cookie: cookie } });
    const body = meResponseSchema.parse(await res.json());

    expect(body.memberships).toEqual([
      { storeId: active.id, storeName: "A store", role: "manager" },
    ]);
  });

  test("works after sign-out → 401 again", async () => {
    const cookie = await signIn(app, TEST_OWNER.ownerEmail, TEST_OWNER.ownerPassword);
    const out = await app.request("/api/auth/sign-out", {
      method: "POST",
      headers: fromWeb({ Cookie: cookie }),
    });
    expect(out.status).toBe(200);

    const res = await app.request("/api/v1/me", { headers: { Cookie: cookie } });
    expect(res.status).toBe(401);
  });
});
