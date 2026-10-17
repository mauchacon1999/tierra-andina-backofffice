import { describe, expect, test } from "bun:test";

import { amountSchema } from "./amount";
import { formatValidationMessage as text } from "./messages";

const firstMessage = (value: unknown) => {
  const token = amountSchema.safeParse(value).error?.issues[0]?.message;
  return token === undefined ? undefined : text(token);
};

describe("amountSchema", () => {
  test.each(["0", "0.0", "15", "15.5", "1234.5678", "9999999999.9999"])("accepts %p", (value) => {
    expect(amountSchema.parse(value)).toBe(value);
  });

  test("rejects negative amounts", () => {
    expect(firstMessage("-1")).toBe("El monto no puede ser menor que 0");
    expect(firstMessage("-0.5")).toBe("El monto no puede ser menor que 0");
  });

  test("rejects more than 4 decimals", () => {
    expect(firstMessage("1.23456")).toBe("El monto admite como máximo 4 decimales");
  });

  test("rejects more than 10 integer digits (numeric(14,4))", () => {
    expect(firstMessage("12345678901")).toBe("El monto admite como máximo 10 dígitos enteros");
  });

  test.each(["", "abc", "1,5", "1e3", " 1", "1.", ".5", "+1", "NaN"])(
    "rejects non-numeric format %p",
    (value) => {
      expect(firstMessage(value)).toBe(
        "El monto debe ser un número con punto decimal (p. ej. 15.50)",
      );
    },
  );

  test("rejects non-string types", () => {
    expect(firstMessage(15.5)).toBe("El monto debe enviarse como texto");
    expect(firstMessage(null)).toBe("El monto debe enviarse como texto");
  });
});
