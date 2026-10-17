import type { StaffUser } from "@ta/validators";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createUser,
  listUsers,
  setUserPassword,
  updateUser,
} from "@/features/users/api/user-requests";
import { UsersScreen } from "@/features/users/components/users-screen";
import { ApiError } from "@/lib/api";
import { setDesktop } from "@/testing/media";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/users/api/user-requests", () => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  setUserPassword: vi.fn(),
}));

const OWNER: StaffUser = {
  id: "0199f000-0000-7000-8000-000000000001",
  name: "Ender",
  email: "owner@tierra-andina.local",
  role: "owner",
  isActive: true,
  isSelf: true,
  createdAt: "2026-10-01T12:00:00.000Z",
};
const MARIA: StaffUser = {
  id: "0199f000-0000-7000-8000-000000000002",
  name: "María",
  email: "maria@tierra-andina.local",
  role: "manager",
  isActive: true,
  isSelf: false,
  createdAt: "2026-10-02T12:00:00.000Z",
};

describe("UsersScreen", () => {
  beforeEach(() => {
    setDesktop(true);
    vi.mocked(listUsers).mockResolvedValue([OWNER, MARIA]);
    vi.mocked(createUser).mockReset();
    vi.mocked(updateUser).mockReset();
    vi.mocked(setUserPassword).mockReset();
  });

  it("lists the users with their role and status; the owner has no actions", async () => {
    render(<UsersScreen />, { wrapper: SwrTestWrapper });

    const table = await screen.findByRole("table", { name: "Usuarios de la tienda" });
    const [, ownerRow, mariaRow] = await within(table).findAllByRole("row");
    expect(within(ownerRow!).getByText("Tú")).toBeDefined();
    expect(within(ownerRow!).getByText("Dueño")).toBeDefined();
    expect(within(mariaRow!).getByText("Encargado")).toBeDefined();
    expect(within(mariaRow!).getByText("Activo")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Acciones de Ender" })).toBeNull();
    expect(screen.getByRole("button", { name: "Acciones de María" })).toBeDefined();
  });

  it("creates a receiver with the password the owner gives", async () => {
    vi.mocked(createUser).mockResolvedValue({ ...MARIA, id: "x", name: "Pedro", role: "receiver" });
    render(<UsersScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Nuevo usuario" }));
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: "Pedro" } });
    fireEvent.change(screen.getByLabelText(/^Correo/), {
      target: { value: "pedro@tierra-andina.local" },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: "camioneta123" } });
    fireEvent.click(screen.getByRole("radio", { name: "Receptor" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));

    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith({
        name: "Pedro",
        email: "pedro@tierra-andina.local",
        password: "camioneta123",
        role: "receiver",
      }),
    );
    expect(await screen.findByText(/Usuario creado/)).toBeDefined();
  });

  it("shows a taken email on the email field", async () => {
    vi.mocked(createUser).mockRejectedValue(
      new ApiError({
        status: 409,
        code: "EMAIL_TAKEN",
        message: "Ese correo ya está en uso",
        details: { fieldErrors: { email: ["Ese correo ya está en uso"] } },
      }),
    );
    render(<UsersScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Nuevo usuario" }));
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: "Pedro" } });
    fireEvent.change(screen.getByLabelText(/^Correo/), {
      target: { value: "maria@tierra-andina.local" },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: "camioneta123" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));

    const email = screen.getByLabelText(/^Correo/);
    await waitFor(() => expect(email.getAttribute("aria-invalid")).toBe("true"));
    expect(screen.getByText("Ese correo ya está en uso")).toBeDefined();
  });

  it("rejects a short password before calling the API", async () => {
    render(<UsersScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Acciones de María" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Cambiar contraseña" }));
    fireEvent.change(screen.getByRole("textbox", { name: /^Nueva contraseña/ }), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: /^Nueva contraseña/ }).getAttribute("aria-invalid"),
      ).toBe("true"),
    );
    expect(setUserPassword).not.toHaveBeenCalled();
  });

  it("sets a new password for a manager", async () => {
    vi.mocked(setUserPassword).mockResolvedValue(undefined);
    render(<UsersScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Acciones de María" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Cambiar contraseña" }));
    fireEvent.change(screen.getByRole("textbox", { name: /^Nueva contraseña/ }), {
      target: { value: "nueva-clave-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => expect(setUserPassword).toHaveBeenCalledWith(MARIA.id, "nueva-clave-1"));
    expect(await screen.findByText("Contraseña cambiada. Dásela a María.")).toBeDefined();
  });

  it("deactivates a manager after confirming", async () => {
    vi.mocked(updateUser).mockResolvedValue({ ...MARIA, isActive: false });
    render(<UsersScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Acciones de María" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Desactivar" }));
    expect(screen.getByText("¿Desactivar a María? No podrá entrar a la app.")).toBeDefined();
    expect(updateUser).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(MARIA.id, { isActive: false }));
  });
});
