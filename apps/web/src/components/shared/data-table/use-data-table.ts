"use client";

import { compareDecimals } from "@ta/core";
import {
  constructSortFn,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type Row,
  type RowData,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import type { DataColumn, DataSort, DataTableSorting } from "@/components/shared/data-table/types";
import { LOCALE } from "@/i18n/config";

const collator = new Intl.Collator(LOCALE, { sensitivity: "base", numeric: true });

// Module scope: TanStack needs stable features (CLAUDE.md §10, TanStack v9 setup rules).
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    text: constructSortFn({ sort: (a: string, b: string) => collator.compare(a, b) }),
    // Empty (a missing value, e.g. no sale rate that day) goes before every number.
    decimal: constructSortFn({
      sort: (a: string, b: string) => {
        if (a === "" || b === "") return a === b ? 0 : a === "" ? -1 : 1;
        return compareDecimals(a, b);
      },
    }),
  },
});

export type DataTableFeatures = typeof features;

export type DataTableRow<TData extends RowData> = {
  id: string;
  original: TData;
};

export type DataTableHeader = {
  id: string;
  label: string;
  align: "start" | "end";
  canSort: boolean;
  sorted: false | "asc" | "desc";
  toggleSort: () => void;
};

export type UseDataTableResult<TData extends RowData> = {
  headers: DataTableHeader[];
  rows: DataTableRow<TData>[];
};

const resolve = <T>(updater: Updater<T>, previous: T): T =>
  typeof updater === "function" ? (updater as (old: T) => T)(previous) : updater;

const toSorting = (sort: DataSort | undefined): SortingState => (sort ? [sort] : []);

/**
 * TanStack Table v9 behind a small API: columns in, ordered rows and sortable headers out.
 * Client mode sorts the loaded rows; server mode only reports the chosen sort to the caller.
 */
export function useDataTable<TData extends RowData>(
  data: TData[],
  columns: DataColumn<TData>[],
  getRowId: (row: TData) => string,
  sorting: DataTableSorting | undefined,
): UseDataTableResult<TData> {
  const isServer = sorting?.mode === "server";
  const [clientSorting, setClientSorting] = useState<SortingState>(
    toSorting(sorting?.mode === "client" ? sorting.initial : undefined),
  );
  const state = isServer ? toSorting(sorting.value) : clientSorting;

  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<DataTableFeatures, TData>();
    return helper.columns(
      columns.map((column) =>
        helper.accessor((row) => column.sortValue?.(row) ?? "", {
          id: column.id,
          header: column.header,
          sortFn: column.sortAs ?? "text",
          enableSorting: isServer ? column.isServerSortable === true : !!column.sortValue,
        }),
      ),
    );
  }, [columns, isServer]);

  const table = useTable({
    features,
    columns: tableColumns,
    data,
    getRowId: (row: TData) => getRowId(row),
    manualSorting: isServer,
    enableSortingRemoval: false,
    state: { sorting: state },
    onSortingChange: (updater: Updater<SortingState>) => {
      const next = resolve(updater, state);
      if (sorting?.mode === "server") {
        const [first] = next;
        if (first) sorting.onChange({ id: first.id, desc: first.desc });
      } else {
        setClientSorting(next);
      }
    },
  });

  const byId = new Map(columns.map((column) => [column.id, column]));
  const headers = table.getHeaderGroups()[0]?.headers ?? [];

  return {
    headers: headers.map((header) => {
      const column = byId.get(header.column.id);
      return {
        id: header.column.id,
        label: column?.header ?? header.column.id,
        align: column?.align ?? "start",
        canSort: header.column.getCanSort(),
        sorted: header.column.getIsSorted(),
        toggleSort: () => header.column.toggleSorting(),
      };
    }),
    rows: table.getRowModel().rows.map((row: Row<DataTableFeatures, TData>) => ({
      id: row.id,
      original: row.original,
    })),
  };
}
