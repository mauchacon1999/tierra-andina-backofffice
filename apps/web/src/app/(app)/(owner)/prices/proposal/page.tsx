import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PriceProposalScreen } from "@/features/price-lists/components/price-proposal-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("prices.proposalPageTitle") }) };
}

export default async function PriceProposalPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("prices");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary-text">
          {t("proposalTitle")}
        </h1>
        <p className="mt-1 text-muted">{t("proposalSubtitle")}</p>
      </header>
      <PriceProposalScreen />
    </div>
  );
}
