import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ManualPricesScreen } from "@/features/price-lists/components/manual-prices-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("manualPrices.pageTitle") }) };
}

export default async function ManualPricesPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("manualPrices");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary-text">{t("title")}</h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </header>
      <ManualPricesScreen />
    </div>
  );
}
