"use client";

import type {
  ExpenseCategory,
  MobilePaymentData,
  PayableDetail,
  PayableFields,
  PayableList,
  PayableListQueryInput,
  PayablePaymentFields,
  PayableTerms,
} from "@ta/validators";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import {
  createPayable,
  deletePayment,
  getMobilePaymentData,
  getPayable,
  listExpenseCategories,
  listPayables,
  recordPayment,
  replacePayable,
  setPayableTerms,
  voidPayable,
} from "@/features/payables/api/payable-requests";
import type { ApiError } from "@/lib/api";
import { isPayablesKey, queryKeys } from "@/lib/query-keys";

const NO_CATEGORIES: ExpenseCategory[] = [];

export type UsePayablesResult = {
  page: PayableList | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

export function usePayables(params: PayableListQueryInput): UsePayablesResult {
  const { data, error, isLoading, mutate } = useSWR<PayableList, ApiError>(
    queryKeys.payables.list(params),
    () => listPayables(params),
    { keepPreviousData: true },
  );
  return { page: data, isLoading, error, retry: () => void mutate() };
}

export type UsePayableResult = {
  payable: PayableDetail | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

export function usePayable(id: string): UsePayableResult {
  const { data, error, isLoading, mutate } = useSWR<PayableDetail, ApiError>(
    queryKeys.payables.detail(id),
    () => getPayable(id),
  );
  return { payable: data, isLoading, error, retry: () => void mutate() };
}

export type UseMobilePaymentResult = {
  data: MobilePaymentData | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

/** What to pay today by pago móvil. `enabled: false` asks nothing (a paid or voided invoice). */
export function useMobilePayment(id: string, enabled: boolean): UseMobilePaymentResult {
  const { data, error, isLoading, mutate } = useSWR<MobilePaymentData, ApiError>(
    enabled ? queryKeys.payables.mobilePayment(id) : null,
    () => getMobilePaymentData(id),
  );
  return { data, isLoading, error, retry: () => void mutate() };
}

export function useExpenseCategories(): { categories: ExpenseCategory[]; isLoading: boolean } {
  const { data, isLoading } = useSWR<ExpenseCategory[], ApiError>(
    queryKeys.expenseCategories,
    listExpenseCategories,
  );
  return { categories: data ?? NO_CATEGORIES, isLoading };
}

export type PayableMutation<Arg> = {
  run: (arg: Arg) => Promise<PayableDetail>;
  isRunning: boolean;
};

/** A write that answers the invoice; every payables key (lists, detail, pago móvil) and home refresh. */
function usePayableMutation<Arg>(
  name: string,
  request: (arg: Arg) => Promise<PayableDetail>,
): PayableMutation<Arg> {
  const { mutate } = useSWRConfig();
  // Wrapped: with a generic argument SWR's trigger type cannot be resolved (it checks
  // whether the argument may be undefined).
  const { trigger, isMutating } = useSWRMutation<
    PayableDetail,
    ApiError,
    readonly string[],
    { value: Arg }
  >(["payables", "mutation", name], (_key, { arg }) => request(arg.value));
  return {
    run: async (arg) => {
      const payable = await trigger({ value: arg });
      await Promise.all([mutate(isPayablesKey), mutate(queryKeys.home)]);
      return payable;
    },
    isRunning: isMutating,
  };
}

export function useCreatePayable(): PayableMutation<PayableFields> {
  return usePayableMutation("create", createPayable);
}

export function useReplacePayable(id: string): PayableMutation<PayableFields> {
  return usePayableMutation(`replace-${id}`, (input: PayableFields) => replacePayable(id, input));
}

export function useSetPayableTerms(id: string): PayableMutation<PayableTerms> {
  return usePayableMutation(`terms-${id}`, (terms: PayableTerms) => setPayableTerms(id, terms));
}

export function useVoidPayable(id: string): PayableMutation<void> {
  return usePayableMutation(`void-${id}`, () => voidPayable(id));
}

export function useRecordPayment(id: string): PayableMutation<PayablePaymentFields> {
  return usePayableMutation(`pay-${id}`, (input: PayablePaymentFields) => recordPayment(id, input));
}

export function useDeletePayment(id: string): PayableMutation<string> {
  return usePayableMutation(`unpay-${id}`, (paymentId: string) => deletePayment(id, paymentId));
}
