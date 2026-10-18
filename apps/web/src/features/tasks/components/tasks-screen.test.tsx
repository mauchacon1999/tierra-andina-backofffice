import { fireEvent, render, screen, within } from "@testing-library/react";
import type { MembershipRole, Task } from "@ta/validators";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteTask,
  listTaskAssignees,
  listTasks,
  updateTask,
} from "@/features/tasks/api/task-requests";
import { TasksScreen } from "@/features/tasks/components/tasks-screen";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

const session = vi.hoisted(() => ({ role: "owner" as MembershipRole }));

vi.mock("@/features/auth/hooks/use-require-session", () => ({
  useRequireSession: () => ({
    activeMembership: { storeId: "store", storeName: "Tierra Andina", role: session.role },
  }),
}));

vi.mock("@/features/tasks/api/task-requests", () => ({
  listTasks: vi.fn(),
  listTaskAssignees: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

const PENDING: Task = {
  id: "t1",
  title: "Comprar bolsas",
  description: "Las grandes",
  assigneeId: "u1",
  assigneeName: "Ana",
  status: "pending",
  isHighPriority: false,
  createdAt: "2026-10-18T12:00:00.000Z",
};

const URGENT: Task = {
  ...PENDING,
  id: "t2",
  title: "Llamar al puesto",
  description: null,
  status: "done",
  isHighPriority: true,
  createdAt: "2026-10-01T12:00:00.000Z",
};

describe("TasksScreen", () => {
  beforeEach(() => {
    session.role = "owner";
    vi.mocked(listTasks).mockResolvedValue({ data: [PENDING, URGENT] });
    vi.mocked(listTaskAssignees).mockResolvedValue({
      data: [
        { id: "u1", name: "Ana" },
        { id: "u2", name: "Luis" },
      ],
    });
    vi.mocked(updateTask).mockReset();
    vi.mocked(deleteTask).mockReset();
  });

  it("hides the form, lists priority first, and paints status on the left", async () => {
    render(<TasksScreen />, { wrapper: SwrTestWrapper });

    expect(screen.queryByLabelText(/Nombre/)).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Nueva tarea" }));
    expect(screen.getByLabelText(/Nombre/)).toBeDefined();

    const list = screen.getByRole("list", { name: "Tareas" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows[0]?.textContent).toContain("Llamar al puesto");
    expect(rows[1]?.textContent).toContain("Comprar bolsas");

    const pending = screen.getByRole("region", { name: "Comprar bolsas" });
    const urgent = screen.getByRole("region", { name: "Llamar al puesto" });
    expect(pending.className).toContain("border-l-info-border");
    expect(urgent.className).toContain("border-l-warning-border");
    expect(
      within(pending).getByRole("combobox", { name: "Estado de Comprar bolsas" }).textContent,
    ).toContain("Pendiente");
    expect(
      within(urgent).getByRole("combobox", { name: "Estado de Llamar al puesto" }).textContent,
    ).toContain("Finalizada");
    expect(
      within(pending).getByRole("combobox", { name: "Asignada de Comprar bolsas" }).textContent,
    ).toBe("A");
  });

  it("the status pill and the priority flag update that task", async () => {
    render(<TasksScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Marcar prioridad alta" }));
    expect(updateTask).toHaveBeenCalledWith("t1", { isHighPriority: true });

    fireEvent.click(screen.getByRole("button", { name: "Quitar prioridad alta" }));
    expect(updateTask).toHaveBeenCalledWith("t2", { isHighPriority: false });

    fireEvent.click(screen.getByRole("combobox", { name: "Estado de Comprar bolsas" }));
    fireEvent.click(screen.getByRole("option", { name: "En curso" }));
    expect(updateTask).toHaveBeenCalledWith("t1", { status: "in_progress" });

    fireEvent.click(screen.getByRole("combobox", { name: "Asignada de Comprar bolsas" }));
    fireEvent.click(screen.getByRole("option", { name: "Luis" }));
    expect(updateTask).toHaveBeenCalledWith("t1", { assigneeId: "u2" });
  });

  it("arrow keys reorder the tasks and keep that order", async () => {
    const { unmount } = render(<TasksScreen />, { wrapper: SwrTestWrapper });

    const rows = async () =>
      within(await screen.findByRole("list", { name: "Tareas" })).getAllByRole("listitem");
    fireEvent.keyDown(
      within((await rows())[0]!).getByRole("button", { name: "Mover Llamar al puesto" }),
      { key: "ArrowDown" },
    );

    expect((await rows())[0]?.textContent).toContain("Comprar bolsas");
    expect((await rows())[1]?.textContent).toContain("Llamar al puesto");

    unmount();
    render(<TasksScreen />, { wrapper: SwrTestWrapper });
    expect((await rows())[0]?.textContent).toContain("Comprar bolsas");
  });

  it("⋯ asks before deleting", async () => {
    render(<TasksScreen />, { wrapper: SwrTestWrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Acciones de Comprar bolsas" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    expect(deleteTask).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(deleteTask).toHaveBeenCalledWith("t1");
  });

  it("a receiver finishes a task without creating or deleting", async () => {
    session.role = "receiver";
    render(<TasksScreen />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("Prioridad alta")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Nueva tarea" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Acciones de Llamar al puesto" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Asignada de Llamar al puesto" })).toBeNull();

    fireEvent.click(screen.getByRole("combobox", { name: "Estado de Llamar al puesto" }));
    fireEvent.click(screen.getByRole("option", { name: "Observación" }));
    expect(updateTask).toHaveBeenCalledWith("t2", { status: "observation" });
  });
});
