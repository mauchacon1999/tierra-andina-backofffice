"use client";

import type {
  CreateSupplier,
  Supplier,
  SupplierDetail,
  SupplierPaymentAccountInput,
  UpdateSupplier,
} from "@ta/validators";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import {
  addAccount,
  createSupplier,
  deactivateAccount,
  getSupplier,
  replaceAccount,
  updateSupplier,
} from "@/features/suppliers/api/supplier-requests";
import type { ApiError } from "@/lib/api";
import { isSuppliersKey, queryKeys } from "@/lib/query-keys";

export type UseSupplierResult = {
  supplier: SupplierDetail | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

/** A supplier with its pago móvil accounts. `null` id waits (no request). */
export function useSupplier(id: string | null): UseSupplierResult {
  const { data, error, isLoading, mutate } = useSWR<SupplierDetail, ApiError>(
    id ? queryKeys.supplier(id) : null,
    () => getSupplier(id as string),
  );
  return { supplier: data, isLoading, error, retry: () => void mutate() };
}

export type SupplierMutation<Arg, Result> = {
  run: (arg: Arg) => Promise<Result>;
  isRunning: boolean;
};

/** Every supplier key (the list and the details) after a change. */
function useRefreshSuppliers(): () => Promise<void> {
  const { mutate } = useSWRConfig();
  return async () => {
    await mutate(isSuppliersKey);
  };
}

function useSupplierMutation<Arg, Result>(
  name: string,
  request: (arg: Arg) => Promise<Result>,
): SupplierMutation<Arg, Result> {
  const refresh = useRefreshSuppliers();
  // Wrapped: with a generic argument SWR's trigger type cannot be resolved.
  const { trigger, isMutating } = useSWRMutation<
    Result,
    ApiError,
    readonly string[],
    { value: Arg }
  >(["suppliers", "mutation", name], (_key, { arg }) => request(arg.value));
  return {
    run: async (arg) => {
      const result = await trigger({ value: arg });
      await refresh();
      return result;
    },
    isRunning: isMutating,
  };
}

export function useCreateSupplier(): SupplierMutation<CreateSupplier, Supplier> {
  return useSupplierMutation("create", createSupplier);
}

export function useUpdateSupplier(id: string): SupplierMutation<UpdateSupplier, SupplierDetail> {
  return useSupplierMutation(`update-${id}`, (patch: UpdateSupplier) => updateSupplier(id, patch));
}

export type AccountArg = { accountId?: string; input: SupplierPaymentAccountInput };

/** Adds an account, or replaces one when `accountId` is given. */
export function useSaveAccount(supplierId: string): SupplierMutation<AccountArg, SupplierDetail> {
  return useSupplierMutation(`account-${supplierId}`, ({ accountId, input }: AccountArg) =>
    accountId ? replaceAccount(supplierId, accountId, input) : addAccount(supplierId, input),
  );
}

export function useDeactivateAccount(supplierId: string): SupplierMutation<string, SupplierDetail> {
  return useSupplierMutation(`deactivate-${supplierId}`, (accountId: string) =>
    deactivateAccount(supplierId, accountId),
  );
}
