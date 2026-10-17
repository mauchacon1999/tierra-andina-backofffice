import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useErrorMessage } from "@/i18n/use-error-message";
import { ApiError } from "@/lib/api";
import { IntlTestWrapper } from "@/testing/intl-wrapper";

const errorMessage = () =>
  renderHook(() => useErrorMessage(), { wrapper: IntlTestWrapper }).result.current;

describe("useErrorMessage", () => {
  it("translates the client's own codes (the API never answered)", () => {
    const error = new ApiError({ status: 0, code: "NETWORK_ERROR", message: "could not reach" });

    expect(errorMessage()(error, "fallback")).toBe("No se pudo conectar con la API");
  });

  it("shows the API's message for its codes (already in Spanish)", () => {
    const error = new ApiError({
      status: 409,
      code: "TRIP_CLOSED",
      message: "La jornada está cerrada",
    });

    expect(errorMessage()(error, "fallback")).toBe("La jornada está cerrada");
  });

  it("uses the fallback for anything that is not an ApiError", () => {
    expect(errorMessage()(new Error("boom"), "No se pudo guardar")).toBe("No se pudo guardar");
  });
});
