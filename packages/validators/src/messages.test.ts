import { describe, expect, test } from "bun:test";

import {
  formatValidationMessage,
  message,
  VALIDATION_MESSAGES_ES_VE,
  type ValidationMessages,
} from "./messages";

describe("message tokens", () => {
  test("a key alone, or a key with URL-encoded parameters", () => {
    expect(message("noChanges")).toBe("noChanges");
    expect(message("decimal.maxDecimals", { subject: "margin", max: 2 })).toBe(
      "decimal.maxDecimals|subject=margin&max=2",
    );
  });
});

describe("formatValidationMessage", () => {
  test("formats in Spanish by default, resolving the subject", () => {
    expect(formatValidationMessage(message("decimal.positive", { subject: "rate" }))).toBe(
      "La tasa debe ser mayor que 0",
    );
    expect(
      formatValidationMessage(message("decimal.maxDecimals", { subject: "margin", max: 2 })),
    ).toBe("El margen admite como máximo 2 decimales");
    expect(formatValidationMessage(message("noChanges"))).toBe("No hay cambios que guardar");
  });

  test("uses the catalog it is given (another locale)", () => {
    const english: ValidationMessages = {
      ...VALIDATION_MESSAGES_ES_VE,
      subjects: { ...VALIDATION_MESSAGES_ES_VE.subjects, rate: "The rate" },
      decimal: { ...VALIDATION_MESSAGES_ES_VE.decimal, positive: "{subject} must be above 0" },
    };

    expect(formatValidationMessage("decimal.positive|subject=rate", english)).toBe(
      "The rate must be above 0",
    );
  });

  test.each([
    ["plain text", "Los datos enviados no son válidos"],
    ["an unknown key", "decimal.unknown"],
    ["a group instead of a message", "decimal"],
    ["a subject", "subjects.rate"],
  ])("returns %s unchanged", (_case, value) => {
    expect(formatValidationMessage(value)).toBe(value);
  });

  test("keeps a placeholder whose parameter is missing", () => {
    expect(formatValidationMessage("name.tooLong")).toBe(
      "El nombre admite como máximo {max} caracteres",
    );
  });
});
