"use client";

import type { ReceiptLine, ReceiptStatus, ReceiptTrip } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { ReceiptLineCard } from "@/features/receipts/components/receipt-line-card";
import { sortForReceipt } from "@/features/receipts/hooks/use-receipt-screen";
import { formatBusinessDateLong } from "@/utils/format-date";

export type ReceiptTripSectionProps = {
  trip: ReceiptTrip;
  onMark: (line: ReceiptLine, status: ReceiptStatus) => void;
  markingLineId: string | null;
};

/** One open trip: its day, how many purchases are still to check, and their cards. */
export function ReceiptTripSection({
  trip,
  onMark,
  markingLineId,
}: ReceiptTripSectionProps): React.JSX.Element {
  const t = useTranslations("receipts");
  const pending = trip.lines.filter((line) => line.receiptStatus === "pending").length;
  const title = formatBusinessDateLong(trip.businessDate);

  return (
    <section aria-label={title} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold capitalize">{title}</h2>
        {trip.lines.length > 0 && (
          <Badge tone={pending > 0 ? "warning" : "success"}>
            {t("pending", { count: pending })}
          </Badge>
        )}
      </div>
      {trip.note && <p className="text-sm text-muted">{trip.note}</p>}
      {trip.lines.length === 0 && <p className="text-muted">{t("noLines")}</p>}
      <ul className="space-y-3">
        {sortForReceipt(trip.lines).map((line) => (
          <li key={line.id}>
            <ReceiptLineCard
              line={line}
              onMark={(status) => onMark(line, status)}
              isSaving={markingLineId === line.id}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
