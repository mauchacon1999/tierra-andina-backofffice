import { describe, expect, test } from "bun:test";

import { meResponseSchema, membershipRoleSchema } from "./auth";

describe("membershipRoleSchema", () => {
  test.each(["owner", "manager", "receiver"])("accepts %p", (role) => {
    expect(membershipRoleSchema.parse(role)).toBe(role);
  });

  test("rejects unknown roles", () => {
    expect(membershipRoleSchema.safeParse("admin").success).toBe(false);
  });
});

describe("meResponseSchema", () => {
  const valid = {
    user: { id: "01a14314-282a-7000-9464-3fabd385c6ef", name: "Dueño", email: "o@test.local" },
    memberships: [
      {
        storeId: "01a14314-2825-7000-a1d1-bdf734d05981",
        storeName: "Tierra Andina",
        role: "owner" as const,
      },
    ],
  };

  test("accepts the /me payload", () => {
    expect(meResponseSchema.parse(valid)).toEqual(valid);
  });

  test("rejects a membership with an unknown role", () => {
    const invalid = { ...valid, memberships: [{ ...valid.memberships[0], role: "admin" }] };
    expect(meResponseSchema.safeParse(invalid).success).toBe(false);
  });
});
