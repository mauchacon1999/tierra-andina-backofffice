import type { Metadata } from "next";
import { Suspense } from "react";

import { ButtonLink } from "@/components/ui/button-link";
import { ProductList } from "@/features/products/components/product-list";

export const metadata: Metadata = { title: "Productos · Tierra Andina" };

export default function ProductsPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary-text">Productos</h1>
          <p className="mt-1 text-muted">Todo lo que se compra y se vende</p>
        </div>
        <ButtonLink href="/products/new" className="shrink-0 whitespace-nowrap">
          Nuevo producto
        </ButtonLink>
      </header>
      {/* The list reads the URL (filters); Next requires a Suspense boundary for that. */}
      <Suspense
        fallback={
          <p role="status" className="text-muted">
            Cargando…
          </p>
        }
      >
        <ProductList />
      </Suspense>
    </div>
  );
}
