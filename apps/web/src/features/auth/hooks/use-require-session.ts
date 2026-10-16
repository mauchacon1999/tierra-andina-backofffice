"use client";

import type { MeResponse } from "@ta/validators";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useMe } from "@/features/auth/api/use-me";
import { useSessionStore } from "@/stores/use-session-store";

export type ActiveMembership = MeResponse["memberships"][number];

export type UseRequireSessionResult = {
  me: MeResponse | undefined;
  /** The store the user works in: the remembered one if still valid, else their first. */
  activeMembership: ActiveMembership | undefined;
  isLoading: boolean;
};

/**
 * For screens that need a signed-in user: redirects to /login on 401 and keeps the active
 * store (sent as X-Store-Id) pointing at a store the user actually belongs to.
 */
export function useRequireSession(): UseRequireSessionResult {
  const router = useRouter();
  const { me, isLoading, isUnauthenticated } = useMe();
  const activeStoreId = useSessionStore((s) => s.activeStoreId);
  const setActiveStore = useSessionStore((s) => s.setActiveStore);

  const memberships = me?.memberships ?? [];
  const activeMembership = memberships.find((m) => m.storeId === activeStoreId) ?? memberships[0];

  useEffect(() => {
    if (isUnauthenticated) router.replace("/login");
  }, [isUnauthenticated, router]);

  useEffect(() => {
    const storeId = activeMembership?.storeId ?? null;
    if (me && storeId !== activeStoreId) setActiveStore(storeId);
  }, [me, activeMembership?.storeId, activeStoreId, setActiveStore]);

  return { me, activeMembership, isLoading };
}
