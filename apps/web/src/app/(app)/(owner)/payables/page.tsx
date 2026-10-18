import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PayablesScreen } from "@/features/payables/components/payables-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("payables.pageTitle") }) };
}

export default async function PayablesPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("payables");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary-text">{t("title")}</h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </header>
      <PayablesScreen />
    </div>
  );
}
