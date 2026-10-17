import { getTranslations } from "next-intl/server";

import { HomeShortcuts } from "@/features/home/components/home-shortcuts";
import { StatusPanel } from "@/features/system-status/components/status-panel";

export default async function Home(): Promise<React.JSX.Element> {
  const t = await getTranslations("home");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary-text">{t("title")}</h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </header>
      <HomeShortcuts />
      <StatusPanel />
    </div>
  );
}
