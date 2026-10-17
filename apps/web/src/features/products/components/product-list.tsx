"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { useProducts } from "@/features/products/api/use-products";
import { ProductCard } from "@/features/products/components/product-card";
import { ProductFilters } from "@/features/products/components/product-filters";
import { describeProduct } from "@/features/products/helpers/describe-product";
import { useProductFilters } from "@/features/products/hooks/use-product-filters";
import { useUnitLabels } from "@/features/products/hooks/use-unit-labels";
import { useErrorMessage } from "@/i18n/use-error-message";
import { cn } from "@/utils/cn";

/** Catalog list: cards on phones, a table from `md` up; filters live in the URL. */
export function ProductList(): React.JSX.Element {
  const filters = useProductFilters();
  const { page, isLoading, error, retry } = useProducts(filters.query);
  const t = useTranslations("products.list");
  const tc = useTranslations("common");
  const labels = useUnitLabels();
  const errorMessage = useErrorMessage();
  const totalPages = page ? Math.max(1, Math.ceil(page.total / page.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <ProductFilters filters={filters} />

      {error && !page && (
        <Alert tone="error" title={t("loadFailed")}>
          <p>{errorMessage(error, error.message)}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={retry}>
            {tc("retry")}
          </Button>
        </Alert>
      )}
      {isLoading && !page && (
        <p role="status" className="text-muted">
          {tc("loading")}
        </p>
      )}

      {page && page.data.length === 0 && (
        <div className="space-y-3 rounded-2xl border border-dashed border-border-strong p-6 text-center">
          <p className="text-muted">
            {filters.filters.search || filters.filters.categoryId ? t("emptyFiltered") : t("empty")}
          </p>
          <ButtonLink href="/products/new">{t("create")}</ButtonLink>
        </div>
      )}

      {page && page.data.length > 0 && (
        <>
          <p className="text-sm text-muted" aria-live="polite">
            {t("count", { count: page.total })}
          </p>
          <ul className="space-y-3 md:hidden">
            {page.data.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
          <table className="hidden w-full overflow-hidden rounded-2xl border border-border bg-surface text-sm md:table">
            <thead className="bg-surface-muted text-left text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t("columns.name")}</th>
                <th className="px-4 py-2 font-medium">{t("columns.category")}</th>
                <th className="px-4 py-2 font-medium">{t("columns.units")}</th>
                <th className="px-4 py-2 font-medium">{t("columns.pack")}</th>
                <th className="px-4 py-2 font-medium">{t("columns.shrinkage")}</th>
                <th className="px-4 py-2 font-medium">{t("columns.margin")}</th>
              </tr>
            </thead>
            <tbody>
              {page.data.map((product) => {
                const d = describeProduct(product, labels);
                return (
                  <tr
                    key={product.id}
                    className={cn("border-t border-border", !product.isActive && "opacity-60")}
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/products/${product.id}`}
                        className="font-medium text-primary-text hover:underline"
                      >
                        {product.name}
                      </Link>{" "}
                      {!product.isActive && <Badge>{t("inactive")}</Badge>}
                    </td>
                    <td className="px-4 py-2">{product.categoryName}</td>
                    <td className="px-4 py-2">{d.units}</td>
                    <td className="px-4 py-2">{d.pack ?? tc("empty")}</td>
                    <td className="px-4 py-2">{d.shrinkage}</td>
                    <td className="px-4 py-2">{d.margin}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <nav className="flex items-center justify-between gap-3" aria-label={tc("pagination")}>
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.filters.page <= 1}
                onClick={() => filters.setPage(filters.filters.page - 1)}
              >
                {tc("previous")}
              </Button>
              <span className="text-sm text-muted">
                {tc("pageOf", { page: page.page, total: totalPages })}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.filters.page >= totalPages}
                onClick={() => filters.setPage(filters.filters.page + 1)}
              >
                {tc("next")}
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
