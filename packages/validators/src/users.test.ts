import { describe, expect, test } from "bun:test";

import { formatValidationMessage as text } from "./messages";
import { createStaffUserSchema, setUserPasswordSchema, updateStaffUserSchema } from "./users";

const errors = (r: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join("."), text(i.message)]));

describe("createStaffUserSchema", () => {
  test("a manager or receiver; email lower-cased, name without extra spaces", () => {
    expect(
      createStaffUserSchema.parse({
        name: "  Ana   Pérez ",
        email: " Ana@Tierra-Andina.Local ",
        password: "clave-segura",
        role: "manager",
      }),
    ).toEqual({
      name: "Ana Pérez",
      email: "ana@tierra-andina.local",
      password: "clave-segura",
      role: "manager",
    });
  });

  test("owners are not created from the app; password of at least 8 characters", () => {
    expect(
      errors(
        createStaffUserSchema.safeParse({
          name: "Ana",
          email: "x",
          password: "123",
          role: "owner",
        }),
      ),
    ).toEqual({
      email: "El correo no es válido",
      password: "La contraseña debe tener al menos 8 caracteres",
      role: "Elige el rol",
    });
  });
});

describe("updateStaffUserSchema / setUserPasswordSchema", () => {
  test("any of name, role or access; nothing is an error", () => {
    expect(updateStaffUserSchema.parse({ isActive: false })).toEqual({ isActive: false });
    expect(errors(updateStaffUserSchema.safeParse({}))).toEqual({
      "": "No hay cambios que guardar",
    });
  });

  test("a new password follows the same rule", () => {
    expect(setUserPasswordSchema.safeParse({ password: "corta" }).success).toBe(false);
    expect(setUserPasswordSchema.parse({ password: "nueva-clave-1" })).toEqual({
      password: "nueva-clave-1",
    });
  });
});
