"use client";

import { Database, Server } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { StatusCard } from "@/features/system-status/components/status-card";
import { useSystemStatus } from "@/features/system-status/hooks/use-system-status";
import { LOCALE } from "@/i18n/config";

export function StatusPanel(): React.JSX.Element {
  const { api, db, checkedAt, refresh } = useSystemStatus();
  const t = useTranslations("systemStatus");
  const tc = useTranslations("common");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatusCard title={t("api")} icon={Server} state={api} />
        <StatusCard title={t("database")} icon={Database} state={db} />
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span>
          {checkedAt
            ? t("lastCheck", { time: checkedAt.toLocaleTimeString(LOCALE) })
            : t("checking")}
        </span>
        <Button variant="secondary" size="sm" onClick={refresh}>
          {tc("retry")}
        </Button>
      </div>
    </div>
  );
}
