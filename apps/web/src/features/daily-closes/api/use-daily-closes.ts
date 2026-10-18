"use client";

import type {
  Customer,
  DailyClose,
  DailyCloseSummary,
  PaymentMethod,
  SubmitDailyClose,
  UpdateDailyClose,
} from "@ta/validators";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import {
  approveDailyClose,
  countPendingCloses,
  deleteDailyClose,
  getDailyClose,
  listDailyCloses,
  listPaymentMethods,
  searchCustomers,
  submitDailyClose,
  updateDailyClose,
} from "@/features/daily-closes/api/daily-close-requests";
import type { ApiError } from "@/lib/api";
import { isDailyClosesKey, queryKeys } from "@/lib/query-keys";

/** The owner's counter of closes waiting for review refreshes this often. */
export const PENDING_CLOSES_REFRESH_MS = 30_000;

const NO_METHODS: PaymentMethod[] = [];
const NO_CUSTOMERS: Customer[] = [];
const NO_CLOSES: DailyCloseSummary[] = [];

export function usePaymentMethods(): { methods: PaymentMethod[]; isLoading: boolean } {
  const { data, isLoading } = useSWR<PaymentMethod[], ApiError>(
    queryKeys.paymentMethods,
    listPaymentMethods,
    { revalidateOnFocus: false },
  );
  return { methods: data ?? NO_METHODS, isLoading };
}

/** Customers whose name contains `search` (suggestions while typing a credit sale). */
export function useCustomerSearch(search: string): Customer[] {
  const { data } = useSWR<Customer[], ApiError>(
    queryKeys.customers(search.trim()),
    () => searchCustomers(search.trim()),
    { keepPreviousData: true },
  );
  return data ?? NO_CUSTOMERS;
}

export type UseDailyCloseResult = {
  close: DailyClose | undefined;
  /** The day has no close yet (the API answered 404). */
  isMissing: boolean;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

/** The close of one business day; a 404 means "not submitted yet", not an error. */
export function useDailyClose(date: string): UseDailyCloseResult {
  const { data, error, isLoading, mutate } = useSWR<DailyClose, ApiError>(
    date ? queryKeys.dailyCloses.day(date) : null,
    () => getDailyClose(date),
    { shouldRetryOnError: false },
  );
  const isMissing = error?.status === 404;
  return {
    close: data,
    isMissing,
    isLoading,
    error: isMissing ? undefined : error,
    retry: () => void mutate(),
  };
}

export type UseDailyClosesResult = {
  closes: DailyCloseSummary[] | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

export function useDailyCloses(from: string, to: string): UseDailyClosesResult {
  const enabled = from !== "" && to !== "" && from <= to;
  const { data, error, isLoading, mutate } = useSWR<DailyCloseSummary[], ApiError>(
    enabled ? queryKeys.dailyCloses.range(from, to) : null,
    () => listDailyCloses(from, to),
    { keepPreviousData: true },
  );
  return {
    closes: data ?? (isLoading ? undefined : NO_CLOSES),
    isLoading,
    error,
    retry: () => void mutate(),
  };
}

/** Closes waiting for the owner's review (null key = not asked, for other roles). */
export function usePendingCloses(isEnabled: boolean): number {
  const { data } = useSWR<number, ApiError>(
    isEnabled ? queryKeys.dailyCloses.pending : null,
    countPendingCloses,
    { refreshInterval: PENDING_CLOSES_REFRESH_MS },
  );
  return data ?? 0;
}

export type CloseMutation<Arg> = { run: (arg: Arg) => Promise<DailyClose>; isRunning: boolean };

/** Writes the answer into that day's cache and refreshes lists and the pending counter. */
function useAfterCloseWrite(): (close: DailyClose) => Promise<void> {
  const { mutate } = useSWRConfig();
  return async (close) => {
    await mutate(queryKeys.dailyCloses.day(close.businessDate), close, { revalidate: false });
    await mutate((key) => isDailyClosesKey(key) && Array.isArray(key) && key[1] !== "day");
  };
}

export function useSubmitDailyClose(): CloseMutation<SubmitDailyClose> {
  const after = useAfterCloseWrite();
  const { trigger, isMutating } = useSWRMutation<
    DailyClose,
    ApiError,
    readonly string[],
    SubmitDailyClose
  >(["daily-closes", "mutation", "submit"], (_key, { arg }) => submitDailyClose(arg));
  return {
    run: async (arg) => {
      const close = await trigger(arg);
      await after(close);
      return close;
    },
    isRunning: isMutating,
  };
}

export function useUpdateDailyClose(id: string): CloseMutation<UpdateDailyClose> {
  const after = useAfterCloseWrite();
  const { trigger, isMutating } = useSWRMutation<
    DailyClose,
    ApiError,
    readonly string[],
    UpdateDailyClose
  >(["daily-closes", "mutation", "update", id], (_key, { arg }) => updateDailyClose(id, arg));
  return {
    run: async (arg) => {
      const close = await trigger(arg);
      await after(close);
      return close;
    },
    isRunning: isMutating,
  };
}

export function useApproveDailyClose(id: string): CloseMutation<void> {
  const after = useAfterCloseWrite();
  const { trigger, isMutating } = useSWRMutation<DailyClose, ApiError, readonly string[]>(
    ["daily-closes", "mutation", "approve", id],
    () => approveDailyClose(id),
  );
  return {
    run: async () => {
      const close = await trigger();
      await after(close);
      return close;
    },
    isRunning: isMutating,
  };
}

/** Drops the day from the cache and refreshes lists, the pending counter and the home. */
export function useDeleteDailyClose(): {
  run: (close: { id: string; businessDate: string }) => Promise<void>;
  isRunning: boolean;
} {
  const { mutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation<void, ApiError, readonly string[], string>(
    ["daily-closes", "mutation", "delete"],
    (_key, { arg }) => deleteDailyClose(arg),
  );
  return {
    run: async (close) => {
      await trigger(close.id);
      await mutate(queryKeys.dailyCloses.day(close.businessDate), undefined, { revalidate: false });
      await mutate((key) => isDailyClosesKey(key) && Array.isArray(key) && key[1] !== "day");
      await mutate(queryKeys.home);
    },
    isRunning: isMutating,
  };
}
