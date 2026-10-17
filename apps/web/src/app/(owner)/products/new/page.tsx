import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ProductForm } from "@/features/products/components/product-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("products.form.newPageTitle") }) };
}

export default async function NewProductPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("products.form");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-primary-text">{t("newPageTitle")}</h1>
      <ProductForm mode="create" />
    </div>
  );
}
