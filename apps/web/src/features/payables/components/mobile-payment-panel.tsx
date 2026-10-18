"use client";

import type { MobilePaymentData } from "@ta/validators";
import { Copy } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { useMobilePayment } from "@/features/payables/api/use-payables";
import { useCopy, type UseCopyResult } from "@/hooks/use-copy";
import { useErrorMessage } from "@/i18n/use-error-message";
import { cn } from "@/utils/cn";
import { formatBs, formatDecimal, formatMoney } from "@/utils/format-number";

export type MobilePaymentPanelProps = { payableId: string; supplierId: string };

/**
 * "Pagar por pago móvil": today's amount in Bs and, per account of the supplier, the text for
 * the banks' "Pegar datos" plus each value on its own (banks without "Pegar datos").
 */
export function MobilePaymentPanel({
  payableId,
  supplierId,
}: MobilePaymentPanelProps): React.JSX.Element {
  const t = useTranslations("payables.mobilePayment");
  const errorMessage = useErrorMessage();
  const { data, error } = useMobilePayment(payableId, true);
  const copier = useCopy();

  if (error?.code === "BCV_RATE_MISSING") {
    return (
      <Alert tone="warning" title={t("title")}>
        <p>{t("missingRate")}</p>
        <ButtonLink href="/rates" variant="secondary" size="sm" className="mt-2">
          {t("goToRates")}
        </ButtonLink>
      </Alert>
    );
  }
  if (error) return <Alert tone="error">{errorMessage(error, t("loadFailed"))}</Alert>;
  if (!data) return <></>;

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">{t("title")}</h2>
      <div>
        <p className="text-sm text-muted">{t("amount")}</p>
        <p className="text-2xl font-bold tabular-nums">{formatBs(data.amountBs)}</p>
        <p className="text-sm text-muted">
          {data.bcvRate
            ? t("rateUsed", {
                balance: formatMoney(data.balance, data.currency),
                rate: formatDecimal(data.bcvRate, 2),
              })
            : t("fixed")}
        </p>
      </div>
      {data.accounts.length === 0 && (
        <p className="text-sm text-muted">
          {t("noAccounts")}{" "}
          <Link href={`/suppliers/${supplierId}`} className="font-semibold text-primary underline">
            {t("addAccount")}
          </Link>
        </p>
      )}
      <ul className="space-y-3">
        {data.accounts.map((account) => (
          <AccountToPay key={account.id} account={account} data={data} copier={copier} />
        ))}
      </ul>
    </Card>
  );
}

type AccountToPayProps = {
  account: MobilePaymentData["accounts"][number];
  data: MobilePaymentData;
  copier: UseCopyResult;
};

function AccountToPay({ account, data, copier }: AccountToPayProps): React.JSX.Element {
  const t = useTranslations("payables.mobilePayment");
  const fields = [
    { key: "bankCode", label: t("bankCode"), value: account.bankCode },
    { key: "phone", label: t("phone"), value: account.phone },
    { key: "idDocument", label: t("idDocument"), value: account.idDocument },
    { key: "amountText", label: t("amountText"), value: data.amountText },
  ] as const;
  const notice = (key: string) => {
    if (copier.last?.key !== key) return null;
    return (
      <span
        role="status"
        className={cn("text-sm", copier.last.ok ? "text-primary-text" : "text-danger-text")}
      >
        {copier.last.ok ? t("copied") : t("copyFailed")}
      </span>
    );
  };

  return (
    <li className="space-y-2 rounded-xl border border-border p-3">
      <p className="font-medium">{account.bankName}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void copier.copy(`${account.id}:all`, account.clipboard)}>
          <Copy aria-hidden className="size-4" />
          {t("copyAll")}
        </Button>
        {notice(`${account.id}:all`)}
      </div>
      <p className="text-xs text-muted">{t("copyAllHint")}</p>
      <dl className="grid gap-2 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className="flex items-center justify-between gap-2">
            <div>
              <dt className="text-xs text-muted">{field.label}</dt>
              <dd className="font-medium tabular-nums">{field.value}</dd>
            </div>
            <div className="flex items-center gap-2">
              {notice(`${account.id}:${field.key}`)}
              <IconButton
                label={t("copyField", { field: field.label })}
                onClick={() => void copier.copy(`${account.id}:${field.key}`, field.value)}
              >
                <Copy aria-hidden className="size-4" />
              </IconButton>
            </div>
          </div>
        ))}
      </dl>
    </li>
  );
}
