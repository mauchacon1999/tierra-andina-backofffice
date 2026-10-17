"use client";

import type { RowData } from "@tanstack/react-table";

import { Card } from "@/components/ui/card";
import { RowActionsMenu } from "@/components/shared/data-table/row-actions-menu";
import type { DataColumn, RowAction } from "@/components/shared/data-table/types";
import type { UseDataTableResult } from "@/components/shared/data-table/use-data-table";
import { cn } from "@/utils/cn";

export type DataTableCardsProps<TData extends RowData> = {
  label: string;
  table: UseDataTableResult<TData>;
  columns: DataColumn<TData>[];
  rowName: (row: TData) => string;
  rowActions?: ((row: TData) => RowAction[]) | undefined;
  onAction: (action: RowAction) => void;
  rowClassName?: ((row: TData) => string | undefined) | undefined;
};

/** Phone layout: one card per row — the primary column as title, the rest as label/value. */
export function DataTableCards<TData extends RowData>({
  label,
  table,
  columns,
  rowName,
  rowActions,
  onAction,
  rowClassName,
}: DataTableCardsProps<TData>): React.JSX.Element {
  const primary = columns.find((column) => column.isPrimary) ?? columns[0];
  const details = columns.filter((column) => column !== primary && !column.hideInCard);

  return (
    <ul aria-label={label} className="space-y-3">
      {table.rows.map((row) => (
        <li key={row.id}>
          <Card className={cn("space-y-2", rowClassName?.(row.original))}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 font-semibold">{primary?.cell(row.original)}</div>
              {rowActions && (
                <RowActionsMenu
                  rowName={rowName(row.original)}
                  actions={rowActions(row.original)}
                  onSelect={onAction}
                />
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {details.map((column) => (
                <div key={column.id} className="contents">
                  <dt className="text-muted">{column.header}</dt>
                  <dd className="text-right">{column.cell(row.original)}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </li>
      ))}
    </ul>
  );
}
