import { describe, expect, test } from "bun:test";

import { apiErrorSchema } from "@ta/validators";

import { createApp } from "@/app";

import pkg from "../package.json" with { type: "json" };

const WEB_ORIGIN = "http://localhost:3000";

// In-memory app: no server, no .env and no database (pingDb is injected).
function makeApp(pingDb: () => Promise<void> = async () => {}) {
  return createApp({ webOrigin: WEB_ORIGIN, pingDb, logRequests: false });
}

describe("GET /health", () => {
  test("returns 200 with { ok: true, version } and a request id", async () => {
    const res = await makeApp().request("/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, version: pkg.version });
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
});

describe("GET /health/db", () => {
  test("returns 200 when the database answers", async () => {
    const res = await makeApp().request("/health/db");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: "up" });
  });

  test("returns 503 in the unified error format when the database does not answer", async () => {
    const original = console.error;
    console.error = () => {}; // the handler logs the failure; expected here
    try {
      const res = await makeApp(async () => {
        throw new Error("ECONNREFUSED");
      }).request("/health/db");

      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({
        error: { code: "DB_UNAVAILABLE", message: "La base de datos no responde" },
      });
    } finally {
      console.error = original;
    }
  });
});

describe("404", () => {
  test("an unknown route uses the unified error format", async () => {
    const res = await makeApp().request("/does-not-exist");
    const body: unknown = await res.json();

    expect(res.status).toBe(404);
    expect(apiErrorSchema.safeParse(body).success).toBe(true);
    expect(body).toEqual({
      error: { code: "NOT_FOUND", message: "Ruta no encontrada: GET /does-not-exist" },
    });
  });

  test("/api/v1 is mounted but empty", async () => {
    const res = await makeApp().request("/api/v1/products");

    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("NOT_FOUND");
  });
});

describe("CORS", () => {
  test("allows WEB_ORIGIN with credentials", async () => {
    const res = await makeApp().request("/health", { headers: { Origin: WEB_ORIGIN } });

    expect(res.headers.get("access-control-allow-origin")).toBe(WEB_ORIGIN);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  test("does not allow other origins", async () => {
    const res = await makeApp().request("/health", {
      headers: { Origin: "http://other-site.example" },
    });

    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
