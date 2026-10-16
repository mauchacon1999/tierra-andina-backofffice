import { create } from "zustand";
import { persist } from "zustand/middleware";

/*
 * Client-only session state. The user and their memberships are server data and live in SWR
 * (`useMe`); this store only remembers which store the user is working in, so it survives
 * reloads and is sent as `X-Store-Id` by lib/api.ts.
 */

export type SessionState = {
  activeStoreId: string | null;
  setActiveStore: (storeId: string | null) => void;
  clear: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeStoreId: null,
      setActiveStore: (storeId) => set({ activeStoreId: storeId }),
      clear: () => set({ activeStoreId: null }),
    }),
    { name: "tierra-andina-session" },
  ),
);
