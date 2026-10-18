"use client";

import type { MembershipRole } from "@ta/validators";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { NAV_ITEMS } from "@/features/navigation/helpers/nav-items";

const SHORTCUTS: readonly {
  href: string;
  key:
    | "dailyClose"
    | "closes"
    | "shoppingList"
    | "purchases"
    | "receipt"
    | "prices"
    | "rates"
    | "products"
    | "users";
  roles: readonly MembershipRole[];
}[] = [
  { href: "/close", key: "dailyClose", roles: ["owner", "manager"] },
  { href: "/closes", key: "closes", roles: ["owner"] },
  { href: "/shopping-list", key: "shoppingList", roles: ["owner", "manager"] },
  { href: "/purchases", key: "purchases", roles: ["owner"] },
  { href: "/receipt", key: "receipt", roles: ["owner", "receiver"] },
  { href: "/prices", key: "prices", roles: ["owner", "manager"] },
  { href: "/rates", key: "rates", roles: ["owner"] },
  { href: "/products", key: "products", roles: ["owner"] },
  { href: "/users", key: "users", roles: ["owner"] },
];

/** Home entries to the screens of the active role (same rule as the sidebar). */
export function HomeShortcuts(): React.JSX.Element | null {
  const { activeMembership } = useRequireSession();
  const t = useTranslations("home");
  const role = activeMembership?.role;
  const shortcuts = SHORTCUTS.filter((s) => role !== undefined && s.roles.includes(role));
  if (shortcuts.length === 0) return null;

  return (
    <nav aria-label={t("shortcuts")} className="grid gap-3 sm:grid-cols-2">
      {shortcuts.map((s) => {
        const Icon = NAV_ITEMS.find((item) => item.href === s.href)?.icon;
        return (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm"
          >
            {Icon && (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-text">
                <Icon aria-hidden className="size-5" />
              </span>
            )}
            <span className="min-w-0">
              <p className="font-semibold">{t(`${s.key}.title`)}</p>
              <p className="text-sm text-muted">{t(`${s.key}.description`)}</p>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
