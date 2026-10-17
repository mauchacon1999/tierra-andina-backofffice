import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ProductEditScreen } from "@/features/products/components/product-edit-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("products.form.editPageTitle") }) };
}

export default async function EditProductPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("products.form");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-primary-text">{t("editPageTitle")}</h1>
      <ProductEditScreen />
    </div>
  );
}
