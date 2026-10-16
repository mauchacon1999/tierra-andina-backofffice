import { describe, expect, test } from "bun:test";

import { Hono } from "hono";
import { z } from "zod";

import { errorHandler } from "../middleware/errors";
import type { AppEnv } from "./types";
import { validate } from "./validate";

const app = new Hono<AppEnv>()
  .post("/items", validate("json", z.object({ name: z.string().min(1) })), (c) =>
    c.json({ name: c.req.valid("json").name }, 201),
  )
  .onError(errorHandler);

const post = (body: unknown) =>
  app.request("/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("validate", () => {
  test("passes valid input through to the handler", async () => {
    const res = await post({ name: "Tomate" });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ name: "Tomate" });
  });

  test("rejects invalid input with 400 VALIDATION_ERROR in the unified format", async () => {
    const res = await post({ name: "" });
    const body = (await res.json()) as {
      error: { code: string; message: string; details: { fieldErrors: Record<string, unknown> } };
    };

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Los datos enviados no son válidos");
    expect(body.error.details.fieldErrors).toHaveProperty("name");
  });
});
