import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { OpenTripForm } from "@/features/purchases/components/open-trip-form";
import { TripList } from "@/features/purchases/components/trip-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("purchases.list.pageTitle") }) };
}

export default async function PurchasesPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("purchases.list");
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary-text">{t("title")}</h1>
          <p className="mt-1 text-muted">{t("subtitle")}</p>
        </div>
        <ButtonLink href="/rates" variant="secondary" className="shrink-0 whitespace-nowrap">
          {t("ratesLink")}
        </ButtonLink>
      </header>
      <Card>
        <OpenTripForm />
      </Card>
      <TripList />
    </div>
  );
}
