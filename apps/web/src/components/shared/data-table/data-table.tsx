"use client";

import type { RowData } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableCards } from "@/components/shared/data-table/data-table-cards";
import { DataTableGrid } from "@/components/shared/data-table/data-table-grid";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import type {
  DataColumn,
  DataTablePagination as Pagination,
  DataTableSorting,
  RowAction,
} from "@/components/shared/data-table/types";
import { useDataTable } from "@/components/shared/data-table/use-data-table";
import { useRowActionRunner } from "@/components/shared/data-table/use-row-action-runner";
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/use-media-query";

export type DataTableProps<TData extends RowData> = {
  /** Accessible name of the table / list ("Productos"). */
  label: string;
  data: TData[] | undefined;
  /** Stable (module scope or memoized): TanStack rebuilds its model when it changes. */
  columns: DataColumn<TData>[];
  getRowId: (row: TData) => string;
  /** Row name for the actions button ("Acciones de Tomate perita"). */
  rowName: (row: TData) => string;
  rowActions?: (row: TData) => RowAction[];
  rowClassName?: (row: TData) => string | undefined;
  sorting?: DataTableSorting;
  pagination?: Pagination;
  isLoading?: boolean;
  /** Load error (translated message) with a retry button; `title` defaults to a generic one. */
  error?: { title?: string; message: string; onRetry: () => void } | undefined;
  /** Shown when there are no rows ("Aún no hay productos" + a button). */
  empty: ReactNode;
};

/**
 * Lists of records (docs/design-system.md §3.3): a sortable table on desktop and cards on
 * phones from the same columns, a "⋯" actions menu per row, loading/empty/error states and
 * server pagination. Built on TanStack Table v9 (`useDataTable`).
 */
export function DataTable<TData extends RowData>(props: DataTableProps<TData>): React.JSX.Element {
  const t = useTranslations();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const rows: TData[] = props.data ?? EMPTY;
  const table = useDataTable(rows, props.columns, props.getRowId, props.sorting);
  const actions = useRowActionRunner();

  if (props.error && !props.data) {
    return (
      <Alert tone="error" title={props.error.title ?? t("dataTable.loadFailed")}>
        <p>{props.error.message}</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={props.error.onRetry}>
          {t("common.retry")}
        </Button>
      </Alert>
    );
  }
  if (props.isLoading && !props.data) {
    return (
      <p role="status" className="text-muted">
        {t("common.loading")}
      </p>
    );
  }
  if (rows.length === 0) return <>{props.empty}</>;

  const Layout = isDesktop ? DataTableGrid : DataTableCards;
  return (
    <div className="space-y-3">
      <Layout
        label={props.label}
        table={table}
        columns={props.columns}
        rowName={props.rowName}
        rowActions={props.rowActions}
        onAction={actions.select}
        rowClassName={props.rowClassName}
      />
      {props.pagination && <DataTablePagination pagination={props.pagination} />}
      <ConfirmDialog
        isOpen={actions.pending !== null}
        question={actions.pending?.confirm?.question ?? ""}
        confirmLabel={actions.pending?.confirm?.confirmLabel ?? t("dataTable.confirm")}
        tone={actions.pending?.tone === "danger" ? "danger" : "primary"}
        isLoading={actions.isRunning}
        loadingText={t("dataTable.working")}
        onConfirm={() => void actions.confirm()}
        onCancel={actions.cancel}
      />
    </div>
  );
}

// Stable fallback: a new [] each render would make TanStack rebuild its row model.
const EMPTY: never[] = [];
