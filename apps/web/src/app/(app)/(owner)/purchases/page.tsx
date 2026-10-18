import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/button-link";
import { OpenTripSection } from "@/features/purchases/components/open-trip-section";
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
        <div className="flex shrink-0 gap-2">
          <ButtonLink href="/shopping-list" variant="secondary" className="whitespace-nowrap">
            {t("listLink")}
          </ButtonLink>
          <ButtonLink href="/rates" variant="secondary" className="whitespace-nowrap">
            {t("ratesLink")}
          </ButtonLink>
        </div>
      </header>
      <OpenTripSection />
      <TripList />
    </div>
  );
}
