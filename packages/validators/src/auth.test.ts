import { describe, expect, test } from "bun:test";

import { meResponseSchema, membershipRoleSchema, signInSchema } from "./auth";

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

describe("signInSchema", () => {
  const message = (value: unknown) => signInSchema.safeParse(value).error?.issues[0]?.message;

  test("trims and lowercases the email", () => {
    expect(signInSchema.parse({ email: "  Owner@Tierra.Test ", password: "x" })).toEqual({
      email: "owner@tierra.test",
      password: "x",
    });
  });

  test("asks for the email when it is empty", () => {
    expect(message({ email: "   ", password: "x" })).toBe("Escribe tu correo");
  });

  test("rejects an invalid email", () => {
    expect(message({ email: "not-an-email", password: "x" })).toBe("El correo no es válido");
  });

  test("asks for the password when it is empty", () => {
    expect(message({ email: "a@b.co", password: "" })).toBe("Escribe tu contraseña");
  });
});
