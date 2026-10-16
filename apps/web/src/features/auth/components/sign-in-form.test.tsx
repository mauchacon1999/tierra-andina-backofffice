import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { signInWithEmail } from "@/features/auth/api/auth-requests";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { ApiError } from "@/lib/api";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/auth/api/auth-requests", () => ({
  signInWithEmail: vi.fn(),
  signOut: vi.fn(),
  getMe: vi
    .fn()
    .mockResolvedValue({ user: { id: "u", name: "n", email: "e@x.co" }, memberships: [] }),
}));

function fill(email: string, password: string) {
  fireEvent.input(screen.getByLabelText("Correo"), { target: { value: email } });
  fireEvent.input(screen.getByLabelText("Contraseña"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("SignInForm", () => {
  beforeEach(() => {
    vi.mocked(signInWithEmail).mockReset();
    router.replace.mockReset();
    render(<SignInForm />, { wrapper: SwrTestWrapper });
  });

  it("shows validation messages next to the fields", async () => {
    fill("", "");

    expect(await screen.findByText("Escribe tu correo")).toBeDefined();
    expect(screen.getByText("Escribe tu contraseña")).toBeDefined();
    expect(screen.getByLabelText("Correo").getAttribute("aria-invalid")).toBe("true");
    expect(signInWithEmail).not.toHaveBeenCalled();
  });

  it("submits the credentials", async () => {
    vi.mocked(signInWithEmail).mockResolvedValue();

    fill("owner@test.local", "secret-123");

    await waitFor(() =>
      expect(signInWithEmail).toHaveBeenCalledWith({
        email: "owner@test.local",
        password: "secret-123",
      }),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  });

  it("shows the API error in an alert", async () => {
    vi.mocked(signInWithEmail).mockRejectedValue(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "No se pudo conectar con la API" }),
    );

    fill("owner@test.local", "secret-123");

    expect((await screen.findByRole("alert")).textContent).toBe("No se pudo conectar con la API");
  });
});
