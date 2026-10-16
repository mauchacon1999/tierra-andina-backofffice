"use client";

import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { useProducts } from "@/features/products/api/use-products";
import { ProductCard } from "@/features/products/components/product-card";
import { ProductFilters } from "@/features/products/components/product-filters";
import { describeProduct } from "@/features/products/helpers/describe-product";
import { useProductFilters } from "@/features/products/hooks/use-product-filters";
import { cn } from "@/utils/cn";

/** Catalog list: cards on phones, a table from `md` up; filters live in the URL. */
export function ProductList(): React.JSX.Element {
  const filters = useProductFilters();
  const { page, isLoading, error, retry } = useProducts(filters.query);
  const totalPages = page ? Math.max(1, Math.ceil(page.total / page.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <ProductFilters filters={filters} />

      {error && !page && (
        <Alert tone="error" title="No se pudieron cargar los productos">
          <p>{error.message}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={retry}>
            Reintentar
          </Button>
        </Alert>
      )}
      {isLoading && !page && (
        <p role="status" className="text-muted">
          Cargando…
        </p>
      )}

      {page && page.data.length === 0 && (
        <div className="space-y-3 rounded-2xl border border-dashed border-border-strong p-6 text-center">
          <p className="text-muted">
            {filters.filters.search || filters.filters.categoryId
              ? "No hay productos con esos filtros."
              : "Aún no hay productos."}
          </p>
          <ButtonLink href="/products/new">Crear producto</ButtonLink>
        </div>
      )}

      {page && page.data.length > 0 && (
        <>
          <p className="text-sm text-muted" aria-live="polite">
            {page.total === 1 ? "1 producto" : `${page.total} productos`}
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
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Categoría</th>
                <th className="px-4 py-2 font-medium">Unidades</th>
                <th className="px-4 py-2 font-medium">Bulto</th>
                <th className="px-4 py-2 font-medium">Merma</th>
                <th className="px-4 py-2 font-medium">Margen</th>
              </tr>
            </thead>
            <tbody>
              {page.data.map((product) => {
                const d = describeProduct(product);
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
                      {!product.isActive && <Badge>Inactivo</Badge>}
                    </td>
                    <td className="px-4 py-2">{product.categoryName}</td>
                    <td className="px-4 py-2">{d.units}</td>
                    <td className="px-4 py-2">{d.pack ?? "—"}</td>
                    <td className="px-4 py-2">{d.shrinkage}</td>
                    <td className="px-4 py-2">{d.margin}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <nav className="flex items-center justify-between gap-3" aria-label="Paginación">
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.filters.page <= 1}
                onClick={() => filters.setPage(filters.filters.page - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted">
                Página {page.page} de {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.filters.page >= totalPages}
                onClick={() => filters.setPage(filters.filters.page + 1)}
              >
                Siguiente
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
