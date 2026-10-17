import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable, type DataTableProps } from "@/components/shared/data-table/data-table";
import type { DataColumn } from "@/components/shared/data-table/types";
import { IntlTestWrapper } from "@/testing/intl-wrapper";
import { setDesktop } from "@/testing/media";

type Fruit = { id: string; name: string; price: string };

const FRUITS: Fruit[] = [
  { id: "1", name: "Ñame", price: "9.5000" },
  { id: "2", name: "aguacate", price: "10.0000" },
  { id: "3", name: "Banano", price: "2.2500" },
];

const COLUMNS: DataColumn<Fruit>[] = [
  { id: "name", header: "Nombre", cell: (f) => f.name, sortValue: (f) => f.name, isPrimary: true },
  {
    id: "price",
    header: "Precio",
    cell: (f) => f.price,
    sortValue: (f) => f.price,
    sortAs: "decimal",
    align: "end",
  },
];

const renderTable = (props: Partial<DataTableProps<Fruit>> = {}) =>
  render(
    <DataTable
      label="Frutas"
      data={FRUITS}
      columns={COLUMNS}
      getRowId={(f) => f.id}
      rowName={(f) => f.name}
      empty={<p>Sin frutas</p>}
      sorting={{ mode: "client" }}
      {...props}
    />,
    { wrapper: IntlTestWrapper },
  );

const firstColumn = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0]?.textContent);

describe("DataTable on desktop", () => {
  it("sorts text the Spanish way (case and accents ignored, ñ after n) when a header is clicked", () => {
    setDesktop(true);
    renderTable();

    fireEvent.click(screen.getByRole("button", { name: "Ordenar por Nombre" }));
    expect(firstColumn()).toEqual(["aguacate", "Banano", "Ñame"]);
    expect(screen.getByRole("columnheader", { name: /Nombre/ }).getAttribute("aria-sort")).toBe(
      "ascending",
    );

    fireEvent.click(screen.getByRole("button", { name: "Ordenar por Nombre" }));
    expect(firstColumn()).toEqual(["Ñame", "Banano", "aguacate"]);
  });

  it("sorts decimal strings by value, not as text (2.25 < 9.5 < 10)", () => {
    setDesktop(true);
    renderTable({ sorting: { mode: "client", initial: { id: "price", desc: false } } });

    expect(firstColumn()).toEqual(["Banano", "Ñame", "aguacate"]);
  });

  it("server sorting only reports the new sort (the API orders the rows)", () => {
    setDesktop(true);
    const onChange = vi.fn();
    renderTable({
      columns: COLUMNS.map((c) => ({ ...c, isServerSortable: c.id === "name" })),
      sorting: { mode: "server", value: { id: "name", desc: false }, onChange },
    });

    expect(screen.queryByRole("button", { name: "Ordenar por Precio" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ordenar por Nombre" }));

    expect(onChange).toHaveBeenCalledWith({ id: "name", desc: true });
    expect(firstColumn()).toEqual(["Ñame", "aguacate", "Banano"]);
  });

  it("row actions: plain ones run at once, confirmed ones ask first in a dialog", async () => {
    setDesktop(true);
    const onEdit = vi.fn();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderTable({
      rowActions: (f) => [
        { id: "edit", label: "Editar", onSelect: () => onEdit(f.id) },
        {
          id: "delete",
          label: "Eliminar",
          tone: "danger",
          onSelect: () => onDelete(f.id),
          confirm: { question: `¿Eliminar ${f.name}?`, confirmLabel: "Eliminar" },
        },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "Acciones de Banano" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar" }));
    expect(onEdit).toHaveBeenCalledWith("3");
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Acciones de Banano" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    const dialog = screen.getByRole("dialog", { name: "¿Eliminar Banano?" });
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("3"));
  });

  it("the actions menu closes with Escape and gives focus back to its button", () => {
    setDesktop(true);
    renderTable({ rowActions: () => [{ id: "a", label: "Editar", onSelect: vi.fn() }] });
    const button = screen.getByRole("button", { name: "Acciones de Ñame" });

    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("paginates with the server's total", () => {
    setDesktop(true);
    const onPageChange = vi.fn();
    renderTable({ pagination: { page: 1, pageSize: 3, total: 7, onPageChange } });

    expect(screen.getByText("Página 1 de 3")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

describe("DataTable on phones", () => {
  it("shows one card per row: the primary column as title, the rest as label and value", () => {
    renderTable();

    expect(screen.queryByRole("table")).toBeNull();
    const cards = within(screen.getByRole("list", { name: "Frutas" })).getAllByRole("listitem");
    expect(cards).toHaveLength(3);
    expect(within(cards[0]!).getByText("Precio")).toBeDefined();
    expect(within(cards[0]!).getByText("9.5000")).toBeDefined();
  });
});

describe("DataTable states", () => {
  it.each([
    ["empty", { data: [] }, "Sin frutas"],
    ["loading", { data: undefined, isLoading: true }, "Cargando…"],
  ])("%s", (_case, props, text) => {
    renderTable(props);
    expect(screen.getByText(text)).toBeDefined();
  });

  it("load error with retry", () => {
    const onRetry = vi.fn();
    renderTable({ data: undefined, error: { message: "La API no responde", onRetry } });

    expect(screen.getByRole("alert").textContent).toContain("La API no responde");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
