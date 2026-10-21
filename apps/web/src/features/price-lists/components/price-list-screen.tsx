"use client";

import { toBusinessDate } from "@ta/core";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/data-table/data-table";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button-link";
import { TextField } from "@/components/ui/text-field";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { usePriceProposal } from "@/features/price-lists/api/use-price-proposal";
import { usePriceListTable } from "@/features/price-lists/hooks/use-price-list-table";
import { useErrorMessage } from "@/i18n/use-error-message";
import { formatBusinessDateLong } from "@/utils/format-date";
import { formatDecimal } from "@/utils/format-number";

/** Sale prices in force, for the owner now and the manager when that user exists. */
export function PriceListScreen(): React.JSX.Element {
  const table = usePriceListTable();
  const { activeMembership } = useRequireSession();
  const proposal = usePriceProposal(activeMembership?.role === "owner");
  const t = useTranslations("prices");
  const errorMessage = useErrorMessage();
  const published = table.list?.publishedAt;
  const needsReview =
    proposal.proposal?.proposedSaleRate != null || proposal.proposal?.bcvChanged === true;

  return (
    <div className="space-y-4">
      {needsReview && (
        <Alert tone="warning" title={t("reviewProposal")}>
          <ButtonLink href="/prices/proposal" variant="secondary">
            {t("openProposal")}
          </ButtonLink>
        </Alert>
      )}
      {table.list && published && (
        <p className="text-sm text-muted">
          {t("meta", {
            when: formatBusinessDateLong(toBusinessDate(new Date(published))),
            rate: formatDecimal(table.list.saleRate, 2),
          })}
        </p>
      )}
      {table.list && table.list.lines.length > 0 && (
        <div className="sm:w-72">
          <TextField
            label={t("search")}
            type="search"
            placeholder={t("searchPlaceholder")}
            value={table.search}
            onChange={(event) => table.setSearch(event.target.value)}
          />
        </div>
      )}
      <DataTable
        label={t("label")}
        data={table.isEmpty ? [] : table.visibleLines}
        columns={table.columns}
        getRowId={(line) => line.id}
        rowName={(line) => line.productName}
        sorting={{ mode: "client", initial: { id: "product", desc: false } }}
        isLoading={table.isLoading}
        error={
          table.error && {
            title: t("loadFailed"),
            message: errorMessage(table.error, table.error.message),
            onRetry: table.retry,
          }
        }
        empty={<p className="text-muted">{table.search.trim() ? t("noMatch") : t("empty")}</p>}
      />
    </div>
  );
}
