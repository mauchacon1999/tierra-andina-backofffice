"use client";

import type { TripDetail } from "@ta/validators";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { formatMoney } from "@/utils/format-number";

export type TripPayablesProps = { trip: TripDetail };

/** The supplier invoices this trip's credit lines became when it closed. */
export function TripPayables({ trip }: TripPayablesProps): React.JSX.Element | null {
  const t = useTranslations("purchases.trip");
  if (trip.payables.length === 0) return null;

  return (
    <Card className="space-y-2">
      <h2 className="font-semibold">{t("payablesTitle")}</h2>
      <ul className="space-y-1">
        {trip.payables.map((payable) => (
          <li key={payable.id}>
            <Link
              href={`/payables/${payable.id}`}
              className="font-medium text-primary-text tabular-nums hover:underline"
            >
              {t("payableLink", {
                code: payable.code,
                supplier: payable.supplierName,
                total: formatMoney(payable.total, payable.currency),
              })}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
