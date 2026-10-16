import type { Metadata } from "next";

import { ProductForm } from "@/features/products/components/product-form";

export const metadata: Metadata = { title: "Nuevo producto · Tierra Andina" };

export default function NewProductPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-primary-text">Nuevo producto</h1>
      <ProductForm mode="create" />
    </div>
  );
}
