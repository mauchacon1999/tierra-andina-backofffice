import { describe, expect, test } from "bun:test";

import { montoSchema } from "./monto";

const mensaje = (value: unknown) => montoSchema.safeParse(value).error?.issues[0]?.message;

describe("montoSchema", () => {
  test.each(["0", "0.0", "15", "15.5", "1234.5678", "9999999999.9999"])("acepta %p", (value) => {
    expect(montoSchema.parse(value)).toBe(value);
  });

  test("rechaza negativos", () => {
    expect(mensaje("-1")).toBe("El monto no puede ser negativo");
    expect(mensaje("-0.5")).toBe("El monto no puede ser negativo");
  });

  test("rechaza más de 4 decimales", () => {
    expect(mensaje("1.23456")).toBe("El monto admite como máximo 4 decimales");
  });

  test("rechaza más de 10 dígitos enteros (numeric(14,4))", () => {
    expect(mensaje("12345678901")).toBe("El monto admite como máximo 10 dígitos enteros");
  });

  test.each(["", "abc", "1,5", "1e3", " 1", "1.", ".5", "+1", "NaN"])(
    "rechaza formato no numérico %p",
    (value) => {
      expect(mensaje(value)).toBe("El monto debe ser un número con punto decimal (p. ej. 15.50)");
    },
  );

  test("rechaza tipos que no son string", () => {
    expect(mensaje(15.5)).toBe("El monto debe enviarse como texto");
    expect(mensaje(null)).toBe("El monto debe enviarse como texto");
  });
});
