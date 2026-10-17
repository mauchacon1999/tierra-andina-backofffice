"use client";

import type { RowData } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { RowActionsMenu } from "@/components/shared/data-table/row-actions-menu";
import type { DataColumn, RowAction } from "@/components/shared/data-table/types";
import type { UseDataTableResult } from "@/components/shared/data-table/use-data-table";
import { cn } from "@/utils/cn";

export type DataTableGridProps<TData extends RowData> = {
  label: string;
  table: UseDataTableResult<TData>;
  columns: DataColumn<TData>[];
  rowName: (row: TData) => string;
  rowActions?: ((row: TData) => RowAction[]) | undefined;
  onAction: (action: RowAction) => void;
  rowClassName?: ((row: TData) => string | undefined) | undefined;
};

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

/** Desktop layout: a real <table> with sortable headers and a "⋯" column. */
export function DataTableGrid<TData extends RowData>({
  label,
  table,
  columns,
  rowName,
  rowActions,
  onAction,
  rowClassName,
}: DataTableGridProps<TData>): React.JSX.Element {
  const t = useTranslations("dataTable");
  const byId = new Map(columns.map((column) => [column.id, column]));

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table aria-label={label} className="w-full text-sm">
        <thead className="bg-surface-muted text-left text-muted">
          <tr>
            {table.headers.map((header) => {
              const SortIcon =
                header.sorted === "asc"
                  ? ArrowUp
                  : header.sorted === "desc"
                    ? ArrowDown
                    : ArrowUpDown;
              return (
                <th
                  key={header.id}
                  scope="col"
                  aria-sort={header.sorted ? ARIA_SORT[header.sorted] : undefined}
                  className={cn("px-4 py-2 font-medium", header.align === "end" && "text-right")}
                >
                  {header.canSort ? (
                    <button
                      type="button"
                      onClick={header.toggleSort}
                      aria-label={t("sortBy", { column: header.label })}
                      className={cn(
                        "inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
                        header.sorted && "text-foreground",
                      )}
                    >
                      {header.label}
                      <SortIcon aria-hidden className="size-3.5" />
                    </button>
                  ) : (
                    header.label
                  )}
                </th>
              );
            })}
            {rowActions && (
              <th scope="col" className="w-12 px-2 py-2">
                <span className="sr-only">{t("actions")}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.id} className={cn("border-t border-border", rowClassName?.(row.original))}>
              {table.headers.map((header) => {
                const column = byId.get(header.id);
                return (
                  <td
                    key={header.id}
                    className={cn(
                      "px-4 py-2",
                      column?.align === "end" && "text-right tabular-nums",
                    )}
                  >
                    {column?.cell(row.original)}
                  </td>
                );
              })}
              {rowActions && (
                <td className="px-2 py-1 text-right">
                  <RowActionsMenu
                    rowName={rowName(row.original)}
                    actions={rowActions(row.original)}
                    onSelect={onAction}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
