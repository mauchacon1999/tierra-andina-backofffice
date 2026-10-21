"use client";

import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/data-table/data-table";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { TextField } from "@/components/ui/text-field";
import { useManualPricesScreen } from "@/features/price-lists/hooks/use-manual-prices-screen";
import { useErrorMessage } from "@/i18n/use-error-message";
import { formatDecimal } from "@/utils/format-number";

/** "Precio manual": type each product's price in Bs and copy the list for WhatsApp. */
export function ManualPricesScreen(): React.JSX.Element {
  const s = useManualPricesScreen();
  const t = useTranslations("manualPrices");
  const errorMessage = useErrorMessage();
  const isReady = !s.isLoading && !s.error;

  return (
    <div className="space-y-4">
      {isReady && s.saleRate === null && (
        <Alert tone="warning" title={t("noRate")}>
          <ButtonLink href="/rates" variant="secondary">
            {t("goToRates")}
          </ButtonLink>
        </Alert>
      )}
      {s.saleRate !== null && (
        <p className="text-sm text-muted">
          {t("rateNote", { rate: formatDecimal(s.saleRate, 2) })}
        </p>
      )}
      {s.actionError && <Alert tone="error">{s.actionError}</Alert>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:w-72">
          <TextField
            label={t("search")}
            type="search"
            placeholder={t("searchPlaceholder")}
            value={s.search}
            onChange={(event) => s.setSearch(event.target.value)}
          />
        </div>
        <div className="space-y-1 sm:text-right">
          <Button
            variant="primary"
            disabled={s.whatsappCount === 0}
            onClick={() => void s.copyForWhatsapp()}
          >
            <Copy aria-hidden className="size-4" />
            {t("copy")}
          </Button>
          <p className="text-sm text-muted" aria-live="polite">
            {s.copied
              ? s.copied.ok
                ? t("copied", { count: s.whatsappCount })
                : t("copyFailed")
              : s.whatsappCount > 0
                ? t("copyCount", { count: s.whatsappCount })
                : t("copyNone")}
          </p>
        </div>
      </div>

      <DataTable
        label={t("label")}
        data={s.visibleRows}
        columns={s.columns}
        getRowId={(row) => row.productId}
        rowName={(row) => row.productName}
        sorting={{ mode: "client", initial: { id: "product", desc: false } }}
        isLoading={s.isLoading}
        error={
          s.error && {
            title: t("loadFailed"),
            message: errorMessage(s.error, s.error.message),
            onRetry: s.retry,
          }
        }
        empty={<p className="text-muted">{s.search ? t("noMatch") : t("empty")}</p>}
      />
    </div>
  );
}
