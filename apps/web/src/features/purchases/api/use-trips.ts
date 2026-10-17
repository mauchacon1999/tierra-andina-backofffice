"use client";

import type { Supplier, TripDetail, TripList, TripListQueryInput } from "@ta/validators";
import useSWR from "swr";

import { getTrip, listSuppliers, listTrips } from "@/features/purchases/api/purchase-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type UseTripsResult = {
  page: TripList | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

export function useTrips(params: TripListQueryInput): UseTripsResult {
  const { data, error, isLoading, mutate } = useSWR<TripList, ApiError>(
    queryKeys.trips.list(params),
    () => listTrips(params),
  );
  return { page: data, isLoading, error, retry: () => void mutate() };
}

export type UseTripResult = {
  trip: TripDetail | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

/** One trip with its lines. */
export function useTrip(id: string): UseTripResult {
  const { data, error, isLoading, mutate } = useSWR<TripDetail, ApiError>(
    queryKeys.trips.detail(id),
    () => getTrip(id),
  );
  return { trip: data, isLoading, error, retry: () => void mutate() };
}

export type UseSuppliersResult = {
  suppliers: Supplier[];
  isLoading: boolean;
};

export function useSuppliers(): UseSuppliersResult {
  const { data, isLoading } = useSWR<Supplier[], ApiError>(queryKeys.suppliers, listSuppliers, {
    revalidateOnFocus: false,
  });
  return { suppliers: data ?? [], isLoading };
}
