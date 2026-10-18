"use client";

import type { ReceiptLine, ReceiptStatus, ReceiptTrip } from "@ta/validators";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { PendingList } from "@/features/receipts/components/pending-list";
import { ReceiptLineCard } from "@/features/receipts/components/receipt-line-card";
import { groupReceipt } from "@/features/receipts/helpers/group-receipt";
import { formatBusinessDateLong } from "@/utils/format-date";

export type ReceiptTripSectionProps = {
  trip: ReceiptTrip;
  onMark: (line: ReceiptLine, status: ReceiptStatus) => void;
  markingLineId: string | null;
};

/** One open trip in two blocks: what has not arrived, then what already has. */
export function ReceiptTripSection({
  trip,
  onMark,
  markingLineId,
}: ReceiptTripSectionProps): React.JSX.Element {
  const t = useTranslations("receipts");
  const board = groupReceipt(trip);
  const pendingLines = board.onTheWay.length;
  const pendingItems = board.toBuy.length + board.onTheWay.length + board.missing.length;
  const hasAnything = trip.lines.length > 0 || trip.toBuy.length > 0;
  const title = formatBusinessDateLong(trip.businessDate);

  return (
    <section aria-label={title} className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold capitalize">{title}</h2>
        {trip.lines.length > 0 && (
          <Badge tone={pendingLines > 0 ? "warning" : "success"}>
            {t("pending", { count: pendingLines })}
          </Badge>
        )}
      </div>
      {trip.note && <p className="text-sm text-muted">{trip.note}</p>}
      {!hasAnything && <p className="text-muted">{t("noLines")}</p>}
      {hasAnything && (
        <>
          <section aria-label={t("pendingTitle")} className="space-y-3">
            <h3 className="font-semibold">{t("pendingTitle")}</h3>
            {pendingItems === 0 ? (
              <p className="text-sm text-muted">{t("pendingEmpty")}</p>
            ) : (
              <PendingList
                tripId={trip.id}
                board={board}
                onMark={onMark}
                markingLineId={markingLineId}
              />
            )}
          </section>
          <section aria-label={t("receivedTitle")} className="space-y-3">
            <h3 className="font-semibold">{t("receivedTitle")}</h3>
            {board.arrived.length === 0 ? (
              <p className="text-sm text-muted">{t("receivedEmpty")}</p>
            ) : (
              <ul className="space-y-3">
                {board.arrived.map((line) => (
                  <li key={line.id}>
                    <ReceiptLineCard
                      line={line}
                      onMark={(status) => onMark(line, status)}
                      isSaving={markingLineId === line.id}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}
