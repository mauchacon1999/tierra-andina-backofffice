"use client";

import type {
  OpenTrip,
  PurchaseLineFields,
  Trip,
  TripDetail,
  UpdatePurchaseLine,
} from "@ta/validators";
import { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import {
  addLine,
  closeTrip,
  deleteLine,
  openTrip,
  updateLine,
} from "@/features/purchases/api/purchase-requests";
import type { ApiError } from "@/lib/api";
import { isProductsKey, isTripsKey, queryKeys } from "@/lib/query-keys";

/*
 * Trip writes. Each one returns the whole trip; it is written into the detail cache right away
 * (no extra request) and lists are revalidated. Line writes also refresh products, whose last
 * shrinkage/margin and unit lock change.
 */

export type Mutation<Arg, Result> = { run: (arg: Arg) => Promise<Result>; isRunning: boolean };

function useAfterTripWrite(): (trip: TripDetail | Trip, refreshProducts: boolean) => Promise<void> {
  const { mutate } = useSWRConfig();
  return async (trip, refreshProducts) => {
    if ("lines" in trip) await mutate(queryKeys.trips.detail(trip.id), trip, { revalidate: false });
    await mutate((key) => isTripsKey(key) && Array.isArray(key) && key[1] === "list");
    if (refreshProducts) await mutate(isProductsKey);
  };
}

export function useOpenTrip(): Mutation<OpenTrip, Trip> {
  const after = useAfterTripWrite();
  const { trigger, isMutating } = useSWRMutation<Trip, ApiError, readonly string[], OpenTrip>(
    ["trips", "mutation", "open"],
    (_key, { arg }) => openTrip(arg),
  );
  return {
    run: async (arg) => {
      const trip = await trigger(arg);
      await after(trip, false);
      return trip;
    },
    isRunning: isMutating,
  };
}

export function useCloseTrip(tripId: string): Mutation<void, TripDetail> {
  const after = useAfterTripWrite();
  const { trigger, isMutating } = useSWRMutation<TripDetail, ApiError, readonly string[]>(
    ["trips", "mutation", "close", tripId],
    () => closeTrip(tripId),
  );
  return {
    run: async () => {
      const trip = await trigger();
      await after(trip, false);
      return trip;
    },
    isRunning: isMutating,
  };
}

export function useAddLine(tripId: string): Mutation<PurchaseLineFields, TripDetail> {
  const after = useAfterTripWrite();
  const { trigger, isMutating } = useSWRMutation<
    TripDetail,
    ApiError,
    readonly string[],
    PurchaseLineFields
  >(["trips", "mutation", "add-line", tripId], (_key, { arg }) => addLine(tripId, arg));
  return {
    run: async (arg) => {
      const trip = await trigger(arg);
      await after(trip, true);
      return trip;
    },
    isRunning: isMutating,
  };
}

export function useUpdateLine(
  tripId: string,
): Mutation<{ lineId: string; patch: UpdatePurchaseLine }, TripDetail> {
  const after = useAfterTripWrite();
  const { trigger, isMutating } = useSWRMutation<
    TripDetail,
    ApiError,
    readonly string[],
    { lineId: string; patch: UpdatePurchaseLine }
  >(["trips", "mutation", "update-line", tripId], (_key, { arg }) =>
    updateLine(tripId, arg.lineId, arg.patch),
  );
  return {
    run: async (arg) => {
      const trip = await trigger(arg);
      await after(trip, true);
      return trip;
    },
    isRunning: isMutating,
  };
}

export function useDeleteLine(tripId: string): Mutation<string, TripDetail> {
  const after = useAfterTripWrite();
  const { trigger, isMutating } = useSWRMutation<TripDetail, ApiError, readonly string[], string>(
    ["trips", "mutation", "delete-line", tripId],
    (_key, { arg }) => deleteLine(tripId, arg),
  );
  return {
    run: async (lineId) => {
      const trip = await trigger(lineId);
      await after(trip, true);
      return trip;
    },
    isRunning: isMutating,
  };
}
