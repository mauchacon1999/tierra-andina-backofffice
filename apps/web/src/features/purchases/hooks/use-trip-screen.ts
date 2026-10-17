"use client";

import type { PurchaseLine, TripDetail } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useCloseTrip, useDeleteLine } from "@/features/purchases/api/use-trip-mutations";
import { useTrip } from "@/features/purchases/api/use-trips";
import { useErrorMessage } from "@/i18n/use-error-message";
import type { ApiError } from "@/lib/api";

export type UseTripScreenResult = {
  trip: TripDetail | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
  isOpen: boolean;
  /** Line being edited in the dialog, if any. */
  editingLine: PurchaseLine | null;
  editLine: (line: PurchaseLine) => void;
  stopEditing: () => void;
  closeTrip: () => Promise<void>;
  isClosing: boolean;
  deleteLine: (lineId: string) => Promise<void>;
  /** Last failed close/delete, shown above the lines. */
  actionError: string | null;
};

/** The purchase trip screen: the trip, its lines, editing one line, deleting, closing. */
export function useTripScreen(tripId: string): UseTripScreenResult {
  const { trip, isLoading, error, retry } = useTrip(tripId);
  const t = useTranslations("purchases.trip");
  const errorMessage = useErrorMessage();
  const close = useCloseTrip(tripId);
  const remove = useDeleteLine(tripId);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, fallback: string): Promise<void> => {
    setActionError(null);
    try {
      await action();
    } catch (failure) {
      setActionError(errorMessage(failure, fallback));
    }
  };

  return {
    trip,
    isLoading,
    error,
    retry,
    isOpen: trip?.status === "open",
    // Read from the trip, so the dialog always shows the saved values of the line.
    editingLine: trip?.lines.find((line) => line.id === editingLineId) ?? null,
    editLine: (line) => setEditingLineId(line.id),
    stopEditing: () => setEditingLineId(null),
    closeTrip: () =>
      run(async () => {
        await close.run();
        setEditingLineId(null);
      }, t("closeFailed")),
    isClosing: close.isRunning,
    deleteLine: (lineId) => run(() => remove.run(lineId), t("deleteFailed")),
    actionError,
  };
}
