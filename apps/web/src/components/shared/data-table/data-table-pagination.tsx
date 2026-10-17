"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { DataTablePagination as Pagination } from "@/components/shared/data-table/types";

export type DataTablePaginationProps = {
  pagination: Pagination;
};

/** "Anterior · Página 2 de 5 · Siguiente" (hidden when everything fits in one page). */
export function DataTablePagination({
  pagination,
}: DataTablePaginationProps): React.JSX.Element | null {
  const t = useTranslations("common");
  const { page, pageSize, total, onPageChange } = pagination;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-between gap-3" aria-label={t("pagination")}>
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        {t("previous")}
      </Button>
      <span className="text-sm text-muted">{t("pageOf", { page, total: totalPages })}</span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {t("next")}
      </Button>
    </nav>
  );
}
