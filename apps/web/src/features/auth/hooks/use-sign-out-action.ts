"use client";

import { useRouter } from "next/navigation";

import { useSignOut } from "@/features/auth/api/use-sign-out";

export type UseSignOutActionResult = {
  onSignOut: () => Promise<void>;
  isSigningOut: boolean;
};

/** "Salir" button behavior: sign out, then go to the login screen (even if the call failed). */
export function useSignOutAction(): UseSignOutActionResult {
  const router = useRouter();
  const { signOut, isSigningOut } = useSignOut();

  return {
    onSignOut: async () => {
      try {
        await signOut();
      } finally {
        router.replace("/login");
      }
    },
    isSigningOut,
  };
}
