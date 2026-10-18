import { getTranslations } from "next-intl/server";

import { HomeOfficialRate } from "@/features/exchange-rates/components/home-official-rate";
import { HomeBriefing } from "@/features/home/components/home-briefing";
import { HomeOpenTrip } from "@/features/home/components/home-open-trip";
import { HomeShortcuts } from "@/features/home/components/home-shortcuts";
import { StatusPanel } from "@/features/system-status/components/status-panel";

export default async function Home(): Promise<React.JSX.Element> {
  const t = await getTranslations("home");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-primary-text">{t("title")}</h1>
      <HomeOfficialRate />
      <HomeBriefing />
      <HomeOpenTrip />
      <HomeShortcuts />
      <StatusPanel />
    </div>
  );
}
