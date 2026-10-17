"use client";

import type { CreateStaffUser, StaffUser, UpdateStaffUser } from "@ta/validators";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import {
  createUser,
  listUsers,
  setUserPassword,
  updateUser,
} from "@/features/users/api/user-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type UseUsersResult = {
  users: StaffUser[] | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

export function useUsers(): UseUsersResult {
  const { data, error, isLoading, mutate } = useSWR<StaffUser[], ApiError>(
    queryKeys.users,
    listUsers,
  );
  return { users: data, isLoading, error, retry: () => void mutate() };
}

export type UserMutation<Arg, Result> = { run: (arg: Arg) => Promise<Result>; isRunning: boolean };

function useRefreshUsers(): () => Promise<void> {
  const { mutate } = useSWRConfig();
  return async () => {
    await mutate(queryKeys.users);
  };
}

export function useCreateUser(): UserMutation<CreateStaffUser, StaffUser> {
  const refresh = useRefreshUsers();
  const { trigger, isMutating } = useSWRMutation<
    StaffUser,
    ApiError,
    readonly string[],
    CreateStaffUser
  >(["users", "mutation", "create"], (_key, { arg }) => createUser(arg));
  return {
    run: async (arg) => {
      const user = await trigger(arg);
      await refresh();
      return user;
    },
    isRunning: isMutating,
  };
}

export function useUpdateUser(): UserMutation<{ id: string; patch: UpdateStaffUser }, StaffUser> {
  const refresh = useRefreshUsers();
  const { trigger, isMutating } = useSWRMutation<
    StaffUser,
    ApiError,
    readonly string[],
    { id: string; patch: UpdateStaffUser }
  >(["users", "mutation", "update"], (_key, { arg }) => updateUser(arg.id, arg.patch));
  return {
    run: async (arg) => {
      const user = await trigger(arg);
      await refresh();
      return user;
    },
    isRunning: isMutating,
  };
}

export function useSetUserPassword(): UserMutation<{ id: string; password: string }, void> {
  const { trigger, isMutating } = useSWRMutation<
    void,
    ApiError,
    readonly string[],
    { id: string; password: string }
  >(["users", "mutation", "password"], (_key, { arg }) => setUserPassword(arg.id, arg.password));
  return { run: (arg) => trigger(arg), isRunning: isMutating };
}
