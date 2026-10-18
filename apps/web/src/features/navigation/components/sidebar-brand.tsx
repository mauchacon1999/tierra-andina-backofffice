"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/shared/brand-mark";
import { cn } from "@/utils/cn";

export type SidebarBrandProps = {
  isCollapsed: boolean;
};

/** Home link: the name beside the isotype, or only the isotype when the menu is collapsed. */
export function SidebarBrand({ isCollapsed }: SidebarBrandProps): React.JSX.Element {
  const t = useTranslations("common");

  return (
    <Link
      href="/"
      aria-label={isCollapsed ? t("appName") : undefined}
      className={cn(
        "flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-1 font-bold text-primary-text",
        "focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none",
        isCollapsed && "justify-center px-0",
      )}
    >
      <BrandMark className="size-10" />
      {!isCollapsed && <span className="truncate text-lg">{t("appName")}</span>}
    </Link>
  );
}
