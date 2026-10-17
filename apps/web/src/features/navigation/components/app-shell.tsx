"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { SidebarBrand } from "@/features/navigation/components/sidebar-brand";
import { SidebarNav } from "@/features/navigation/components/sidebar-nav";
import { SidebarUser } from "@/features/navigation/components/sidebar-user";
import { useAppShell } from "@/features/navigation/hooks/use-app-shell";
import { cn } from "@/utils/cn";

export type AppShellProps = {
  children: ReactNode;
};

/**
 * Backoffice layout: fixed sidebar on desktop (collapsible to icons) with the content in the
 * middle; on phones a top bar with ☰ opens the same menu as a drawer.
 */
export function AppShell({ children }: AppShellProps): React.JSX.Element {
  const shell = useAppShell();
  const t = useTranslations("nav");
  const ToggleIcon = shell.isCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className="flex min-h-full flex-1">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] md:flex",
          shell.isCollapsed ? "w-16" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-1 border-b border-border p-2",
            shell.isCollapsed ? "flex-col" : "justify-between",
          )}
        >
          <SidebarBrand isCollapsed={shell.isCollapsed} />
          <IconButton
            label={shell.isCollapsed ? t("expand") : t("collapse")}
            aria-expanded={!shell.isCollapsed}
            onClick={shell.toggleCollapsed}
          >
            <ToggleIcon aria-hidden className="size-5" />
          </IconButton>
        </div>
        <SidebarNav items={shell.items} isCollapsed={shell.isCollapsed} />
        <SidebarUser isCollapsed={shell.isCollapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-surface px-2 py-1 md:hidden">
          <IconButton
            label={t("openMenu")}
            aria-expanded={shell.isDrawerOpen}
            onClick={shell.openDrawer}
          >
            <Menu aria-hidden className="size-6" />
          </IconButton>
          <SidebarBrand isCollapsed={false} />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>

      <Dialog
        isOpen={shell.isDrawerOpen}
        onClose={shell.closeDrawer}
        title={t("main")}
        closeLabel={t("closeMenu")}
        variant="drawer"
        showTitle={false}
        flush
      >
        <div className="flex h-full flex-col">
          <SidebarNav items={shell.items} isCollapsed={false} />
          <SidebarUser isCollapsed={false} />
        </div>
      </Dialog>
    </div>
  );
}
