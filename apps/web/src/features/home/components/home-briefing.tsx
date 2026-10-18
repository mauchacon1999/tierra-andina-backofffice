"use client";

import type { HomeAlertCode, HomeBriefing } from "@ta/validators";
import {
  ArrowLeftRight,
  BadgePercent,
  Bell,
  ClipboardCheck,
  ClipboardList,
  Coins,
  HandCoins,
  Landmark,
  NotebookPen,
  Tag,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, type CardTone } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { useHomeBriefing } from "@/features/home/api/use-home";
import { useErrorMessage } from "@/i18n/use-error-message";
import { formatBusinessDate } from "@/utils/format-date";
import { formatBs, formatUsd } from "@/utils/format-number";

const ALERT_HREF: Record<HomeAlertCode, string> = {
  closes_pending: "/closes",
  rates_missing: "/rates",
  shopping_open: "/shopping-list",
  receipts_pending: "/receipt",
  no_price_list: "/prices",
  price_proposal: "/prices/proposal",
  bcv_changed: "/rates",
};

type HomeKey =
  | "alertClosesPending"
  | "alertRatesMissing"
  | "alertShoppingOpen"
  | "alertReceiptsPending"
  | "alertNoPriceList"
  | "alertPriceProposal"
  | "alertBcvChanged";

const ALERT_KEY: Record<HomeAlertCode, HomeKey> = {
  closes_pending: "alertClosesPending",
  rates_missing: "alertRatesMissing",
  shopping_open: "alertShoppingOpen",
  receipts_pending: "alertReceiptsPending",
  no_price_list: "alertNoPriceList",
  price_proposal: "alertPriceProposal",
  bcv_changed: "alertBcvChanged",
};

const ALERT_ICON: Record<HomeAlertCode, LucideIcon> = {
  closes_pending: ClipboardCheck,
  rates_missing: Coins,
  shopping_open: ClipboardList,
  receipts_pending: Truck,
  no_price_list: Tag,
  price_proposal: BadgePercent,
  bcv_changed: ArrowLeftRight,
};

type MetricProps = {
  title: string;
  icon: LucideIcon;
  usd: string;
  bs?: string;
  hint: string;
  tone?: CardTone;
};

function Metric({
  title,
  icon: Icon,
  usd,
  bs,
  hint,
  tone = "default",
}: MetricProps): React.JSX.Element {
  return (
    <Card tone={tone} className="space-y-1">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
          <Icon aria-hidden className="size-5" />
        </span>
        {title}
      </p>
      <p className="text-2xl font-bold tracking-tight text-primary-text">{formatUsd(usd)}</p>
      {bs !== undefined && <p className="text-lg font-semibold">{formatBs(bs)}</p>}
      <p className="text-sm text-muted">{hint}</p>
    </Card>
  );
}

/** Greeting plus, for the owner, the week's real numbers and the alerts that are true. */
export function HomeBriefing(): React.JSX.Element | null {
  const { me, activeMembership } = useRequireSession();
  const isOwner = activeMembership?.role === "owner";
  const { briefing, isLoading, error, retry } = useHomeBriefing(isOwner);
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  if (!me) return null;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-primary-text">
          {t("greeting", { name: me.user.name })}
        </h2>
        <p className="mt-1 text-muted">
          {briefing
            ? t("week", {
                from: formatBusinessDate(briefing.week.from),
                to: formatBusinessDate(briefing.week.to),
              })
            : t("subtitle")}
        </p>
      </header>
      {isOwner && isLoading && (
        <p className="flex items-center gap-2 text-muted">
          <Spinner />
          {tc("loading")}
        </p>
      )}
      {isOwner && error && (
        <Alert tone="error" title={errorMessage(error, t("loadFailed"))}>
          <Button variant="secondary" onClick={retry}>
            {tc("retry")}
          </Button>
        </Alert>
      )}
      {briefing && <BriefingBody briefing={briefing} />}
    </section>
  );
}

type BriefingBodyProps = { briefing: HomeBriefing };

function BriefingBody({ briefing }: BriefingBodyProps): React.JSX.Element {
  const t = useTranslations("home");
  const { week, payables, credit, alerts } = briefing;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Metric
          title={t("collected")}
          icon={Wallet}
          usd={week.collected.usd}
          bs={week.collected.bs}
          hint={t("collectedHint", { count: week.closeCount })}
          tone="success"
        />
        <Metric
          title={t("deposited")}
          icon={Landmark}
          usd={week.deposited.usd}
          bs={week.deposited.bs}
          hint={t("depositedHint", {
            usd: formatUsd(week.kept.usd),
            bs: formatBs(week.kept.bs),
          })}
        />
        <Metric
          title={t("payables")}
          icon={HandCoins}
          usd={payables.remainingUsd}
          hint={t("payablesHint", { count: payables.count })}
          tone={payables.count > 0 ? "warning" : "default"}
        />
        <Metric
          title={t("credit")}
          icon={NotebookPen}
          usd={credit.usd}
          bs={credit.bs}
          hint={t("creditHint")}
          tone="default"
        />
      </div>
      <Card className="space-y-2">
        <p className="flex items-center gap-2 font-semibold">
          <Bell aria-hidden className="size-4" />
          {t("alertsTitle")}
        </p>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted">{t("alertsEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => {
              const Icon = ALERT_ICON[alert.code];
              return (
                <li key={alert.code}>
                  <Link
                    href={ALERT_HREF[alert.code]}
                    className="flex items-center gap-2 text-sm font-semibold text-primary underline"
                  >
                    <Icon aria-hidden className="size-4 shrink-0" />
                    {t(ALERT_KEY[alert.code], { count: alert.count })}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
