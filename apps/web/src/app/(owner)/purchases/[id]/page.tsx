import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/button-link";
import { TripScreen } from "@/features/purchases/components/trip-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("purchases.trip.pageTitle") }) };
}

export default async function TripPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("purchases.trip");
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-primary-text">{t("title")}</h1>
        <ButtonLink href="/purchases" variant="secondary" className="shrink-0 whitespace-nowrap">
          {t("backToList")}
        </ButtonLink>
      </header>
      <TripScreen />
    </div>
  );
}
