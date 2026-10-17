import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/button-link";
import { CloseDetailScreen } from "@/features/daily-closes/components/close-detail-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("common.pageTitle", { title: t("closes.pageTitle") }) };
}

export default async function CloseDetailPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("closes");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-primary-text">{t("title")}</h1>
        <ButtonLink href="/closes" variant="secondary" className="shrink-0 whitespace-nowrap">
          {t("back")}
        </ButtonLink>
      </header>
      <CloseDetailScreen />
    </div>
  );
}
