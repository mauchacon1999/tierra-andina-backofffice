"use client";

import { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import { signOut } from "@/features/auth/api/auth-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/stores/use-session-store";

export type UseSignOutResult = {
  signOut: () => Promise<void>;
  isSigningOut: boolean;
};

/** Signs out, forgets the cached user and the active store. */
export function useSignOut(): UseSignOutResult {
  const { mutate } = useSWRConfig();
  const clearSession = useSessionStore((s) => s.clear);
  const { trigger, isMutating } = useSWRMutation<void, ApiError, readonly string[]>(
    ["sign-out"],
    () => signOut(),
  );

  return {
    signOut: async () => {
      await trigger();
      clearSession();
      await mutate(queryKeys.me, undefined, { revalidate: false });
    },
    isSigningOut: isMutating,
  };
}
