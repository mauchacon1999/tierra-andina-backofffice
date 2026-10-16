import { describe, expect, test } from "bun:test";

import { apiErrorSchema } from "@ta/validators";

import pkg from "../package.json" with { type: "json" };
import { createApp } from "./app";

const WEB_ORIGIN = "http://localhost:3000";

// App en memoria: sin servidor, sin .env y sin base (pingDb inyectado).
function makeApp(pingDb: () => Promise<void> = async () => {}) {
  return createApp({ webOrigin: WEB_ORIGIN, pingDb, logRequests: false });
}

describe("GET /health", () => {
  test("responde 200 con { ok: true, version }", async () => {
    const res = await makeApp().request("/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, version: pkg.version });
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
});

describe("GET /health/db", () => {
  test("responde 200 si la base contesta", async () => {
    const res = await makeApp().request("/health/db");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: "up" });
  });

  test("responde 503 con el formato de error si la base no contesta", async () => {
    const original = console.error;
    console.error = () => {}; // el handler registra el fallo; aquí es esperado
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
  test("ruta inexistente usa el formato único de error", async () => {
    const res = await makeApp().request("/no-existe");
    const body: unknown = await res.json();

    expect(res.status).toBe(404);
    expect(apiErrorSchema.safeParse(body).success).toBe(true);
    expect(body).toEqual({
      error: { code: "NOT_FOUND", message: "Ruta no encontrada: GET /no-existe" },
    });
  });

  test("/api/v1 está montado pero vacío", async () => {
    const res = await makeApp().request("/api/v1/productos");

    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("NOT_FOUND");
  });
});

describe("CORS", () => {
  test("permite WEB_ORIGIN con credenciales", async () => {
    const res = await makeApp().request("/health", { headers: { Origin: WEB_ORIGIN } });

    expect(res.headers.get("access-control-allow-origin")).toBe(WEB_ORIGIN);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  test("no autoriza otros orígenes", async () => {
    const res = await makeApp().request("/health", {
      headers: { Origin: "http://otro-sitio.example" },
    });

    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
