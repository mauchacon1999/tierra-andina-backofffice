import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { uniq } from "@ta/db/testing";
import { storeSettingsSchema } from "@ta/validators";

import { call, errorOf, signInRoles, type RoleSession } from "@/testing/http";

let s: RoleSession;

beforeAll(async () => {
  s = await signInRoles();
});

afterAll(async () => {
  // Leave the seeded defaults for the other test files.
  await call(s.app, "PATCH", "/settings", s.owner, {
    defaultMargin: "0.50",
    usdRoundingStep: "0.05",
  });
});

describe("GET /api/v1/settings", () => {
  test("returns the seeded settings to every role", async () => {
    for (const cookie of [s.owner, s.manager, s.receiver]) {
      const res = await call(s.app, "GET", "/settings", cookie);

      expect(res.status).toBe(200);
      expect(storeSettingsSchema.parse(res.body)).toEqual({
        usdRoundingStep: "0.05",
        bsRoundingStep: "1",
        saleRateMode: "manual",
        saleRateMarkupPct: "0",
        defaultMargin: "0.50",
        receiverCanSeePrices: false,
      });
    }
  });

  test("401 without a session", async () => {
    expect((await call(s.app, "GET", "/settings", null)).status).toBe(401);
  });
});

describe("PATCH /api/v1/settings", () => {
  test("owner updates some settings; the rest stay", async () => {
    const res = await call(s.app, "PATCH", "/settings", s.owner, {
      defaultMargin: "0.6",
      usdRoundingStep: "0.1",
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      defaultMargin: "0.6",
      usdRoundingStep: "0.1",
      bsRoundingStep: "1",
    });
  });

  test("new products use the updated default margin", async () => {
    await call(s.app, "PATCH", "/settings", s.owner, { defaultMargin: "0.7" });
    const product = await call(s.app, "POST", "/products/quick", s.owner, {
      name: uniq("Ocumo"),
      purchaseUnit: "kg",
      saleUnit: "kg",
    });

    expect(product.body.lastMargin).toBe("0.7000");
  });

  test("400 for invalid values, 403 for a manager", async () => {
    const invalid = await call(s.app, "PATCH", "/settings", s.owner, { usdRoundingStep: "0" });
    const manager = await call(s.app, "PATCH", "/settings", s.manager, { defaultMargin: "0.4" });

    expect(invalid.status).toBe(400);
    expect(errorOf(invalid.body).code).toBe("VALIDATION_ERROR");
    expect(manager.status).toBe(403);
  });
});
