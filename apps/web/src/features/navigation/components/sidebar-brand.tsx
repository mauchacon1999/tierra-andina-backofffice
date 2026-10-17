"use client";

import { Store } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { cn } from "@/utils/cn";

export type SidebarBrandProps = {
  isCollapsed: boolean;
};

/** App name at the top of the sidebar, links home. */
export function SidebarBrand({ isCollapsed }: SidebarBrandProps): React.JSX.Element {
  const t = useTranslations("common");

  return (
    <Link
      href="/"
      aria-label={isCollapsed ? t("appName") : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold text-primary-text",
        "focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
        isCollapsed && "justify-center px-0",
      )}
    >
      <Store aria-hidden className="size-6 shrink-0" />
      {!isCollapsed && <span className="truncate text-lg">{t("appName")}</span>}
    </Link>
  );
}
