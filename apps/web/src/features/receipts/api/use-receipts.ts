"use client";

import type { ReceiptTrip, SetReceipt } from "@ta/validators";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import { listReceipts, setReceipt } from "@/features/receipts/api/receipt-requests";
import type { ApiError } from "@/lib/api";
import { isTripsKey, queryKeys } from "@/lib/query-keys";

/** The receiver's screen refreshes this often: the owner keeps buying while the truck loads. */
export const RECEIPTS_REFRESH_MS = 5000;

const NO_TRIPS: ReceiptTrip[] = [];

export type UseReceiptsResult = {
  trips: ReceiptTrip[];
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

/** Open trips with what to check at the truck, refreshed every few seconds. */
export function useReceipts(): UseReceiptsResult {
  const { data, error, isLoading, mutate } = useSWR<ReceiptTrip[], ApiError>(
    queryKeys.receipts,
    listReceipts,
    { refreshInterval: RECEIPTS_REFRESH_MS },
  );
  return { trips: data ?? NO_TRIPS, isLoading, error, retry: () => void mutate() };
}

export type MarkReceiptArg = { tripId: string; lineId: string; receipt: SetReceipt };

export type UseMarkReceiptResult = {
  run: (arg: MarkReceiptArg) => Promise<ReceiptTrip>;
  isRunning: boolean;
};

/**
 * Marks a line (received / partial / missing / back to pending). The answer replaces that trip
 * in the receipts cache at once; the owner's trip screens are revalidated.
 */
export function useMarkReceipt(): UseMarkReceiptResult {
  const { mutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation<
    ReceiptTrip,
    ApiError,
    readonly string[],
    MarkReceiptArg
  >(["receipts", "mutation", "mark"], (_key, { arg }) =>
    setReceipt(arg.tripId, arg.lineId, arg.receipt),
  );
  return {
    run: async (arg) => {
      const trip = await trigger(arg);
      await mutate<ReceiptTrip[]>(
        queryKeys.receipts,
        (current) => current?.map((t) => (t.id === trip.id ? trip : t)),
        { revalidate: false },
      );
      await mutate(isTripsKey);
      return trip;
    },
    isRunning: isMutating,
  };
}
