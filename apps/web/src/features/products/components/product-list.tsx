"use client";

import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/data-table/data-table";
import { ButtonLink } from "@/components/ui/button-link";
import { useProducts } from "@/features/products/api/use-products";
import { ProductFilters } from "@/features/products/components/product-filters";
import { useProductFilters } from "@/features/products/hooks/use-product-filters";
import { useProductTable } from "@/features/products/hooks/use-product-table";
import { useErrorMessage } from "@/i18n/use-error-message";

/** Catalog list: filters and sort live in the URL; table on desktop, cards on phones. */
export function ProductList(): React.JSX.Element {
  const filters = useProductFilters();
  const { page, isLoading, error, retry } = useProducts(filters.query);
  const table = useProductTable(filters);
  const t = useTranslations("products.list");
  const errorMessage = useErrorMessage();
  const isFiltered = Boolean(filters.filters.search || filters.filters.categoryId);

  return (
    <div className="space-y-4">
      <ProductFilters filters={filters} />
      {page && page.data.length > 0 && (
        <p className="text-sm text-muted" aria-live="polite">
          {t("count", { count: page.total })}
        </p>
      )}
      <DataTable
        label={t("title")}
        data={page?.data}
        columns={table.columns}
        getRowId={(product) => product.id}
        rowName={(product) => product.name}
        rowActions={table.rowActions}
        rowClassName={(product) => (product.isActive ? undefined : "opacity-60")}
        sorting={table.sorting}
        isLoading={isLoading}
        error={
          error && {
            title: t("loadFailed"),
            message: errorMessage(error, error.message),
            onRetry: retry,
          }
        }
        {...(page
          ? {
              pagination: {
                page: page.page,
                pageSize: page.pageSize,
                total: page.total,
                onPageChange: filters.setPage,
              },
            }
          : {})}
        empty={
          <div className="space-y-3 rounded-2xl border border-dashed border-border-strong p-6 text-center">
            <p className="text-muted">{isFiltered ? t("emptyFiltered") : t("empty")}</p>
            <ButtonLink href="/products/new">{t("create")}</ButtonLink>
          </div>
        }
      />
    </div>
  );
}
