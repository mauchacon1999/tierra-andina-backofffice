import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import { DailyRatesForm } from "@/features/exchange-rates/components/daily-rates-form";
import { RatesHistory } from "@/features/exchange-rates/components/rates-history";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("rates.pageTitle") }) };
}

export default async function RatesPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("rates");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary-text">{t("title")}</h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </header>
      <Card>
        <DailyRatesForm />
      </Card>
      <RatesHistory />
    </div>
  );
}
