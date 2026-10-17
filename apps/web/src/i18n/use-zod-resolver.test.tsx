import { renderHook } from "@testing-library/react";
import { message, VALIDATION_MESSAGES_ES_VE, signInSchema } from "@ta/validators";
import type { FieldErrors } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { translateFieldErrors, useZodResolver } from "@/i18n/use-zod-resolver";
import { IntlTestWrapper } from "@/testing/intl-wrapper";

describe("translateFieldErrors", () => {
  it("turns nested validation tokens into text and keeps the field refs", () => {
    const ref = { name: "rates.bcv" };
    const errors: FieldErrors<{ rates: { bcv: string }; name: string }> = {
      rates: {
        bcv: { type: "custom", message: message("decimal.positive", { subject: "rate" }), ref },
      },
      name: { type: "custom", message: "Ya existe un producto con ese nombre" },
    };

    const translated = translateFieldErrors(errors, VALIDATION_MESSAGES_ES_VE);

    expect(translated.rates?.bcv?.message).toBe("La tasa debe ser mayor que 0");
    expect(translated.rates?.bcv?.ref).toBe(ref);
    expect(translated.name?.message).toBe("Ya existe un producto con ese nombre");
  });
});

describe("useZodResolver", () => {
  it("validates with the shared schema and answers in the user's language", async () => {
    const { result } = renderHook(() => useZodResolver(signInSchema), { wrapper: IntlTestWrapper });

    const outcome = await result.current({ email: "", password: "" }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });

    expect(outcome.errors.email?.message).toBe("Escribe tu correo");
    expect(outcome.errors.password?.message).toBe("Escribe tu contraseña");
  });

  it("passes valid values through", async () => {
    const { result } = renderHook(() => useZodResolver(signInSchema), { wrapper: IntlTestWrapper });

    const outcome = await result.current(
      { email: " Owner@Test.Local ", password: "x" },
      undefined,
      { fields: {}, shouldUseNativeValidation: false },
    );

    expect(outcome).toEqual({ values: { email: "owner@test.local", password: "x" }, errors: {} });
  });
});
