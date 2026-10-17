import { create } from "zustand";
import { persist } from "zustand/middleware";

/* UI preferences of this device (CLAUDE.md §10: client-only state, persisted). */

export type UiState = {
  /** Desktop sidebar shows icons only. */
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
    }),
    { name: "tierra-andina-ui" },
  ),
);
