import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ButtonLink } from "@/components/ui/button-link";
import { ProductList } from "@/features/products/components/product-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("products.list.pageTitle") }) };
}

export default async function ProductsPage(): Promise<React.JSX.Element> {
  const t = await getTranslations();
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary-text">
            {t("products.list.title")}
          </h1>
          <p className="mt-1 text-muted">{t("products.list.subtitle")}</p>
        </div>
        <ButtonLink href="/products/new" className="shrink-0 whitespace-nowrap">
          {t("products.list.new")}
        </ButtonLink>
      </header>
      {/* The list reads the URL (filters); Next requires a Suspense boundary for that. */}
      <Suspense
        fallback={
          <p role="status" className="text-muted">
            {t("common.loading")}
          </p>
        }
      >
        <ProductList />
      </Suspense>
    </div>
  );
}
