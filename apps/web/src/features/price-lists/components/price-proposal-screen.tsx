"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable } from "@/components/shared/data-table/data-table";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Spinner } from "@/components/ui/spinner";
import { usePublishPriceProposal } from "@/features/price-lists/api/use-price-proposal";
import { usePriceProposalTable } from "@/features/price-lists/hooks/use-price-proposal-table";
import { useErrorMessage } from "@/i18n/use-error-message";
import { formatDecimal } from "@/utils/format-number";

/** Owner review: today's sale rate next to the list in force, then publish. */
export function PriceProposalScreen(): React.JSX.Element {
  const table = usePriceProposalTable();
  const publish = usePublishPriceProposal();
  const router = useRouter();
  const t = useTranslations("prices");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const [publishError, setPublishError] = useState<unknown>();
  const proposal = table.proposal;
  const canPublish = proposal?.proposedSaleRate != null && table.changed.length > 0;

  const onPublish = (): void => {
    setPublishError(undefined);
    const pending = publish
      .run()
      .then((list) => {
        if (list) router.push("/prices");
      })
      .catch((error: unknown) => setPublishError(error));
    void pending;
  };

  if (table.isLoading) {
    return (
      <p className="flex items-center gap-2 text-muted">
        <Spinner />
        {tc("loading")}
      </p>
    );
  }

  if (table.error) {
    return (
      <Alert tone="error" title={errorMessage(table.error, t("loadFailed"))}>
        <Button variant="secondary" onClick={table.retry}>
          {tc("retry")}
        </Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {proposal?.bcvChanged && (
        <Alert tone="warning" title={t("bcvChanged")}>
          <ButtonLink href="/rates" variant="secondary">
            {t("reviewRates")}
          </ButtonLink>
        </Alert>
      )}
      {table.isEmpty && <p className="text-muted">{t("empty")}</p>}
      {proposal && !canPublish && <p className="text-muted">{t("nothingToPublish")}</p>}
      {canPublish && proposal.proposedSaleRate && (
        <>
          <p className="text-sm text-muted">
            {t("proposalMeta", {
              from: formatDecimal(proposal.currentSaleRate, 2),
              to: formatDecimal(proposal.proposedSaleRate, 2),
              count: table.changed.length,
            })}
          </p>
          <DataTable
            label={t("proposalLabel")}
            data={table.changed}
            columns={table.columns}
            getRowId={(line) => line.id}
            rowName={(line) => line.productName}
            sorting={{ mode: "client", initial: { id: "product", desc: false } }}
            empty={<p className="text-muted">{t("nothingToPublish")}</p>}
          />
          {publishError != null && (
            <Alert tone="error">{errorMessage(publishError, t("loadFailed"))}</Alert>
          )}
          <Button onClick={onPublish} disabled={publish.isRunning}>
            {publish.isRunning ? t("publishing") : t("publishProposal")}
          </Button>
        </>
      )}
    </div>
  );
}
