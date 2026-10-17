"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { usePendingCloses } from "@/features/daily-closes/api/use-daily-closes";
import { isNavItemActive, NAV_ITEMS, type NavItem } from "@/features/navigation/helpers/nav-items";
import { useUiStore } from "@/stores/use-ui-store";

export type ShellNavItem = NavItem & { isActive: boolean; count: number };

export type UseAppShellResult = {
  items: ShellNavItem[];
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

/**
 * Backoffice shell state: the menu entries of the active role, which one is current, the
 * desktop collapse preference (persisted) and the mobile drawer.
 */
export function useAppShell(): UseAppShellResult {
  const pathname = usePathname();
  const { activeMembership } = useRequireSession();
  const isCollapsed = useUiStore((s) => s.isSidebarCollapsed);
  const toggleCollapsed = useUiStore((s) => s.toggleSidebar);
  // The drawer remembers the page it was opened on, so navigating closes it without an effect.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);

  const role = activeMembership?.role;
  // Only the owner reviews closes: other roles never ask for the counter.
  const pendingCloses = usePendingCloses(role === "owner");
  const counters = { pendingCloses } as const;
  return {
    items: NAV_ITEMS.filter((item) => role !== undefined && item.roles.includes(role)).map(
      (item) => ({
        ...item,
        isActive: isNavItemActive(item.href, pathname),
        count: item.counter ? counters[item.counter] : 0,
      }),
    ),
    isCollapsed,
    toggleCollapsed,
    isDrawerOpen: drawerPath === pathname,
    openDrawer: () => setDrawerPath(pathname),
    closeDrawer: () => setDrawerPath(null),
  };
}
