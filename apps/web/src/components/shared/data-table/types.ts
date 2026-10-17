import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** One column of a DataTable. Texts come from the caller (already translated). */
export type DataColumn<TData> = {
  id: string;
  header: string;
  cell: (row: TData) => ReactNode;
  /**
   * Value to sort by in the browser (all rows are on screen). Decimal strings sort with
   * `sortAs: "decimal"` (exact, through @ta/core), everything else as text.
   */
  sortValue?: (row: TData) => string;
  sortAs?: "text" | "decimal";
  /** The column can be sorted by the server (paginated lists); the id is the sort key. */
  isServerSortable?: boolean;
  align?: "start" | "end";
  /** Title of the row's card on phones (one column per table). */
  isPrimary?: boolean;
  /** Leave this column out of the phone cards. */
  hideInCard?: boolean;
};

export type DataSort = { id: string; desc: boolean };

/** Browser sorting (all rows loaded) or server sorting (paginated: the API sorts). */
export type DataTableSorting =
  | { mode: "client"; initial?: DataSort }
  | { mode: "server"; value: DataSort; onChange: (sort: DataSort) => void };

export type RowAction = {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Navigation instead of a callback. */
  href?: string;
  onSelect?: () => void | Promise<void>;
  tone?: "danger";
  /** Ask first in a dialog ("¿Eliminar Tomate?"); `onSelect` runs on confirm. */
  confirm?: { question: string; confirmLabel: string };
};

export type DataTablePagination = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};
