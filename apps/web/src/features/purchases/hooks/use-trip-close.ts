"use client";

import type { Currency } from "@ta/core";
import type { CloseTripInput, TripDetail } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { countPendingReceipt } from "@/features/purchases/helpers/line-receipt";

export type UseTripCloseResult = {
  isLocal: boolean;
  /** Some lines are on credit: closing creates supplier invoices. */
  hasCredit: boolean;
  /** Lines the truck has not checked yet (Coche only). */
  pending: number;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  dueOn: string;
  setDueOn: (dueOn: string) => void;
  dueOnError: string | undefined;
  confirm: () => Promise<void>;
};

/**
 * Closing a trip. A local purchase with credit lines asks for its invoice's currency and due
 * date (required); a Coche trip's invoices are in dollars and get their due date later.
 */
export function useTripClose(
  trip: TripDetail,
  closeTrip: (terms?: CloseTripInput) => Promise<void>,
): UseTripCloseResult {
  const t = useTranslations("purchases.trip");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [dueOn, setDueOn] = useState("");
  const [dueOnError, setDueOnError] = useState<string | undefined>(undefined);
  const isLocal = trip.kind === "local";
  const hasCredit = trip.lines.some((line) => line.paymentStatus === "credit");

  return {
    isLocal,
    hasCredit,
    pending: isLocal ? 0 : countPendingReceipt(trip),
    currency,
    setCurrency,
    dueOn,
    setDueOn: (value) => {
      setDueOn(value);
      setDueOnError(undefined);
    },
    dueOnError,
    confirm: async () => {
      if (!isLocal || !hasCredit) return closeTrip();
      if (!dueOn) {
        setDueOnError(t("payableDueOnRequired"));
        return;
      }
      await closeTrip({ payableCurrency: currency, payableDueOn: dueOn });
    },
  };
}
