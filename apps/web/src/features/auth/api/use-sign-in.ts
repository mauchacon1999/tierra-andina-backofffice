"use client";

import type { SignIn } from "@ta/validators";
import { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import { getMe, signInWithEmail } from "@/features/auth/api/auth-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type UseSignInResult = {
  signIn: (credentials: SignIn) => Promise<void>;
  isSigningIn: boolean;
};

/** Signs in and refreshes `useMe`, so every screen sees the new session. */
export function useSignIn(): UseSignInResult {
  const { mutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation<void, ApiError, readonly string[], SignIn>(
    ["sign-in"],
    (_key, { arg }) => signInWithEmail(arg),
  );

  return {
    signIn: async (credentials) => {
      await trigger(credentials);
      // Load the user into the cache before navigating: a bare revalidation does nothing when
      // no screen is subscribed, and the next screen would read the 401 cached before sign-in.
      await mutate(queryKeys.me, getMe(), { revalidate: false });
    },
    isSigningIn: isMutating,
  };
}
