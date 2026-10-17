"use client";

import type { ReceiptLine, ReceiptStatus, ReceiptTrip } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useMarkReceipt, useReceipts } from "@/features/receipts/api/use-receipts";
import { useErrorMessage } from "@/i18n/use-error-message";
import type { ApiError } from "@/lib/api";

export type PartialTarget = { tripId: string; line: ReceiptLine };

export type UseReceiptScreenResult = {
  trips: ReceiptTrip[];
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
  /** Received / missing / undo are saved at once; partial opens the dialog first. */
  mark: (tripId: string, line: ReceiptLine, status: ReceiptStatus) => void;
  markingLineId: string | null;
  partial: PartialTarget | null;
  closePartial: () => void;
  actionError: string | null;
};

const ORDER: Record<ReceiptStatus, number> = { pending: 0, partial: 1, missing: 2, received: 3 };

/** Lines still to check first, then the rest; same status in the order they were bought. */
export function sortForReceipt(lines: ReceiptLine[]): ReceiptLine[] {
  return [...lines].sort(
    (a, b) =>
      ORDER[a.receiptStatus] - ORDER[b.receiptStatus] || a.createdAt.localeCompare(b.createdAt),
  );
}

/** Truck receipt screen: open trips refreshed every few seconds and one-tap marks. */
export function useReceiptScreen(): UseReceiptScreenResult {
  const receipts = useReceipts();
  const markReceipt = useMarkReceipt();
  const t = useTranslations("receipts");
  const errorMessage = useErrorMessage();
  const [markingLineId, setMarkingLineId] = useState<string | null>(null);
  const [partial, setPartial] = useState<PartialTarget | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const save = async (
    tripId: string,
    line: ReceiptLine,
    status: Exclude<ReceiptStatus, "partial">,
  ) => {
    setActionError(null);
    setMarkingLineId(line.id);
    try {
      await markReceipt.run({ tripId, lineId: line.id, receipt: { status } });
    } catch (error) {
      setActionError(errorMessage(error, t("markFailed")));
    } finally {
      setMarkingLineId(null);
    }
  };

  return {
    trips: receipts.trips,
    isLoading: receipts.isLoading,
    error: receipts.error,
    retry: receipts.retry,
    mark: (tripId, line, status) => {
      if (status === "partial") setPartial({ tripId, line });
      else if (status !== line.receiptStatus) void save(tripId, line, status);
    },
    markingLineId,
    partial,
    closePartial: () => setPartial(null),
    actionError,
  };
}
