import type { Metadata } from "next";

import { ProductEditScreen } from "@/features/products/components/product-edit-screen";

export const metadata: Metadata = { title: "Editar producto · Tierra Andina" };

export default function EditProductPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-primary-text">Editar producto</h1>
      <ProductEditScreen />
    </div>
  );
}
