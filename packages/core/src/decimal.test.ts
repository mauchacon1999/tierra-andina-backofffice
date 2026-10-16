import { describe, expect, test } from "bun:test";

import { sumar } from "./decimal";

describe("sumar", () => {
  test('0.1 + 0.2 da exactamente "0.3"', () => {
    expect(sumar("0.1", "0.2")).toBe("0.3");
  });

  test("suma con 4 decimales sin perder precisión", () => {
    expect(sumar("1234.5678", "0.0001")).toBe("1234.5679");
  });

  test("enteros más allá de la precisión de number", () => {
    expect(sumar("9007199254740993", "1")).toBe("9007199254740994");
  });

  test("admite negativos", () => {
    expect(sumar("-5.25", "2")).toBe("-3.25");
  });

  test("nunca devuelve notación exponencial", () => {
    expect(sumar("0.0000001", "0")).toBe("0.0000001");
    expect(sumar("1e21", "0")).toBe("1000000000000000000000");
  });

  test("rechaza entradas no numéricas", () => {
    expect(() => sumar("abc", "1")).toThrow('a no es un número decimal válido: "abc"');
    expect(() => sumar("1", "")).toThrow(TypeError);
    expect(() => sumar("Infinity", "1")).toThrow(TypeError);
  });
});
