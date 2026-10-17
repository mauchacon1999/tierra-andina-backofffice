"use client";

import type { MembershipRole } from "@ta/validators";
import { useTranslations } from "next-intl";

import Link from "next/link";

import { useRequireSession } from "@/features/auth/hooks/use-require-session";

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
      {shortcuts.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className="block rounded-2xl border border-border bg-surface p-4 shadow-sm"
        >
          <p className="font-semibold">{t(`${s.key}.title`)}</p>
          <p className="text-sm text-muted">{t(`${s.key}.description`)}</p>
        </Link>
      ))}
    </nav>
  );
}
