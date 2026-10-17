"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Tooltip } from "@/components/ui/tooltip";
import type { ShellNavItem } from "@/features/navigation/hooks/use-app-shell";
import { cn } from "@/utils/cn";

export type SidebarNavProps = {
  items: ShellNavItem[];
  /** Icons only; the label moves to a tooltip and the accessible name. */
  isCollapsed: boolean;
};

/** Menu entries; the current section is highlighted and marked `aria-current="page"`. */
export function SidebarNav({ items, isCollapsed }: SidebarNavProps): React.JSX.Element {
  const t = useTranslations("nav");

  return (
    <nav aria-label={t("main")} className="flex-1 overflow-y-auto px-2 py-3">
      <ul className="space-y-1">
        {items.map((item) => {
          const label = t(item.labelKey);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Tooltip label={label} isDisabled={!isCollapsed}>
                <Link
                  href={item.href}
                  aria-current={item.isActive ? "page" : undefined}
                  aria-label={isCollapsed ? label : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
                    isCollapsed && "justify-center px-0",
                    item.isActive
                      ? "bg-primary-soft text-primary-text"
                      : "text-muted hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden className="size-5 shrink-0" />
                  {!isCollapsed && <span className="truncate">{label}</span>}
                </Link>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
