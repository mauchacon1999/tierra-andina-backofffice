"use client";

import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/data-table/data-table";
import { ButtonLink } from "@/components/ui/button-link";
import { OpenLocalPurchaseCard } from "@/features/purchases/components/open-local-purchase-card";
import { useLocalPurchases } from "@/features/purchases/hooks/use-local-purchases";
import { formatBusinessDateLong } from "@/utils/format-date";

/** Goods suppliers bring to the shop: start one, continue the ones in progress, see the saved. */
export function LocalPurchasesScreen(): React.JSX.Element {
  const list = useLocalPurchases();
  const t = useTranslations("localPurchases");

  return (
    <div className="space-y-6">
      <OpenLocalPurchaseCard />
      {list.inProgress.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">{t("inProgress")}</h2>
          <ul className="flex flex-col gap-2">
            {list.inProgress.map((trip) => (
              <li key={trip.id}>
                <ButtonLink href={`/purchases/${trip.id}`} variant="secondary">
                  {trip.supplierName} · {formatBusinessDateLong(trip.businessDate)} ·{" "}
                  {t("continue")}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="space-y-2">
        <h2 className="font-semibold">{t("saved")}</h2>
        <DataTable
          label={t("label")}
          data={list.saved?.data}
          columns={list.columns}
          getRowId={(trip) => trip.id}
          rowName={(trip) => trip.supplierName ?? trip.businessDate}
          rowActions={list.rowActions}
          pagination={
            list.saved && {
              page: list.saved.page,
              pageSize: list.saved.pageSize,
              total: list.saved.total,
              onPageChange: list.setPage,
            }
          }
          isLoading={list.isLoading}
          empty={<p className="text-muted">{t("empty")}</p>}
        />
      </section>
    </div>
  );
}
