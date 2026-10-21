import { fireEvent, render, screen, within } from "@testing-library/react";
import type { MembershipRole } from "@ta/validators";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/features/navigation/components/app-shell";
import { isNavItemActive } from "@/features/navigation/helpers/nav-items";
import { useUiStore } from "@/stores/use-ui-store";
import { IntlTestWrapper } from "@/testing/intl-wrapper";

const session = vi.hoisted(() => ({ role: "owner" as MembershipRole, pathname: "/purchases/t1" }));

vi.mock("next/navigation", () => ({
  usePathname: () => session.pathname,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/features/auth/hooks/use-require-session", () => ({
  useRequireSession: () => ({
    me: { user: { id: "u1", name: "Ender", email: "e@x.co" }, memberships: [] },
    activeMembership: { storeId: "s1", storeName: "Tierra Andina", role: session.role },
  }),
}));
const pending = vi.hoisted(() => ({ count: 0 }));
vi.mock("@/features/daily-closes/api/use-daily-closes", () => ({
  usePendingCloses: (isEnabled: boolean) => (isEnabled ? pending.count : 0),
}));
vi.mock("@/features/auth/api/use-sign-out", () => ({
  useSignOut: () => ({ signOut: vi.fn(), isSigningOut: false }),
}));

const renderShell = () =>
  render(
    <AppShell>
      <p>Contenido</p>
    </AppShell>,
    { wrapper: IntlTestWrapper },
  );

/** The desktop sidebar (the drawer has its own copy of the menu). */
const sidebar = () => within(screen.getByRole("complementary"));

describe("AppShell", () => {
  beforeEach(() => {
    session.role = "owner";
    session.pathname = "/purchases/t1";
    useUiStore.setState({ isSidebarCollapsed: false });
    pending.count = 0;
  });

  it("shows the owner's menu with the current section marked, and the content", () => {
    renderShell();

    const links = sidebar()
      .getAllByRole("link")
      .map((a) => a.textContent);
    expect(links).toEqual([
      "Tierra Andina",
      "Inicio",
      "Cierre del día",
      "Cierres",
      "Faltantes",
      "Tareas",
      "Compras",
      "Compras locales",
      "Recepción",
      "Precios",
      "Precio manual",
      "Tasas del día",
      "Productos",
      "Cuentas por pagar",
      "Proveedores",
      "Usuarios",
    ]);
    expect(sidebar().getByRole("link", { name: "Compras" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByText("Contenido")).toBeDefined();
    expect(sidebar().getByText("Ender")).toBeDefined();
    expect(sidebar().getByText("Tierra Andina · Dueño")).toBeDefined();
  });

  it("other roles only see what they can open", () => {
    session.role = "receiver";
    renderShell();

    expect(sidebar().queryByRole("link", { name: "Compras" })).toBeNull();
    expect(sidebar().getByRole("link", { name: "Inicio" })).toBeDefined();
    expect(sidebar().getByRole("link", { name: "Recepción" })).toBeDefined();
    expect(sidebar().getByRole("link", { name: "Tareas" })).toBeDefined();
    expect(sidebar().queryByRole("link", { name: "Precios" })).toBeNull();
  });

  it("the manager sees the shopping list and the prices, not the purchases", () => {
    session.role = "manager";
    renderShell();

    const links = sidebar()
      .getAllByRole("link")
      .map((a) => a.textContent);
    expect(links).toEqual([
      "Tierra Andina",
      "Inicio",
      "Cierre del día",
      "Faltantes",
      "Tareas",
      "Precios",
    ]);
  });

  it("the owner sees how many closes wait for review, also with the menu collapsed", () => {
    pending.count = 2;
    renderShell();

    expect(sidebar().getByRole("link", { name: /Cierres/ }).textContent).toContain("2 por revisar");

    fireEvent.click(sidebar().getByRole("button", { name: "Contraer menú" }));
    expect(sidebar().getByRole("link", { name: "Cierres, 2 por revisar" })).toBeDefined();
  });

  it("shows only the isotype when the menu is collapsed", () => {
    renderShell();

    fireEvent.click(sidebar().getByRole("button", { name: "Contraer menú" }));

    const brand = sidebar().getByRole("link", { name: "Tierra Andina" });
    expect(brand.textContent).toBe("");
    expect(brand.querySelector("img")?.getAttribute("src")).toBe("/brand/isotype.png");
  });

  it("collapses to icons with accessible names, and remembers it", () => {
    renderShell();

    fireEvent.click(sidebar().getByRole("button", { name: "Contraer menú" }));

    expect(useUiStore.getState().isSidebarCollapsed).toBe(true);
    const purchases = sidebar().getByRole("link", { name: "Compras" });
    expect(purchases.querySelector("span.truncate")).toBeNull();
    expect(sidebar().getByRole("button", { name: "Expandir menú" })).toBeDefined();
  });

  it("on phones ☰ opens the menu as a drawer that closes again", () => {
    renderShell();
    const dialog = screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    expect(dialog.open).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(dialog.open).toBe(true);
    expect(within(dialog).getByRole("link", { name: "Productos" })).toBeDefined();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar menú" }));
    expect(dialog.open).toBe(false);
  });
});

describe("isNavItemActive", () => {
  it.each([
    ["/", "/", true],
    ["/", "/purchases", false],
    ["/purchases", "/purchases", true],
    ["/purchases", "/purchases/123", true],
    ["/products", "/products-old", false],
  ])("%s is active on %s: %s", (href, pathname, expected) => {
    expect(isNavItemActive(href, pathname)).toBe(expected);
  });
});
