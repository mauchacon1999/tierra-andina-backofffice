import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMe, signInWithEmail } from "@/features/auth/api/auth-requests";
import { useSignInForm } from "@/features/auth/hooks/use-sign-in-form";
import { ApiError } from "@/lib/api";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/auth/api/auth-requests", () => ({
  signInWithEmail: vi.fn(),
  signOut: vi.fn(),
  getMe: vi.fn(),
}));

function setup() {
  return renderHook(() => useSignInForm(), { wrapper: SwrTestWrapper });
}

async function submit(result: ReturnType<typeof setup>["result"], email: string, password: string) {
  act(() => {
    result.current.form.setValue("email", email);
    result.current.form.setValue("password", password);
  });
  await act(() => result.current.onSubmit());
}

describe("useSignInForm", () => {
  beforeEach(() => {
    router.replace.mockReset();
    vi.mocked(signInWithEmail).mockReset();
    vi.mocked(getMe).mockResolvedValue({
      user: { id: "u1", name: "Dueño", email: "owner@test.local" },
      memberships: [],
    });
  });

  it("does not call the API and shows field errors when the form is invalid", async () => {
    const { result } = setup();

    await submit(result, "no-es-correo", "");

    expect(signInWithEmail).not.toHaveBeenCalled();
    expect(result.current.form.formState.errors.email?.message).toBe("El correo no es válido");
    expect(result.current.form.formState.errors.password?.message).toBe("Escribe tu contraseña");
  });

  it("sends the trimmed, lowercased email and goes home on success", async () => {
    vi.mocked(signInWithEmail).mockResolvedValue();
    const { result } = setup();

    await submit(result, "  Owner@Test.Local ", "secret-123");

    expect(signInWithEmail).toHaveBeenCalledWith({
      email: "owner@test.local",
      password: "secret-123",
    });
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(result.current.formError).toBeUndefined();
  });

  it("shows the API message (in Spanish) when the credentials are wrong", async () => {
    vi.mocked(signInWithEmail).mockRejectedValue(
      new ApiError({
        status: 401,
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Correo o contraseña incorrectos",
      }),
    );
    const { result } = setup();

    await submit(result, "owner@test.local", "wrong");

    expect(result.current.formError).toBe("Correo o contraseña incorrectos");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows a generic message for unexpected errors", async () => {
    vi.mocked(signInWithEmail).mockRejectedValue(new Error("boom"));
    const { result } = setup();

    await submit(result, "owner@test.local", "secret-123");

    expect(result.current.formError).toBe("No se pudo iniciar sesión. Intenta de nuevo");
  });
});
