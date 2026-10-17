"use client";

import type { MembershipRole } from "@ta/validators";
import { useTranslations } from "next-intl";

import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";

const SHORTCUTS: readonly {
  href: string;
  key: "shoppingList" | "purchases" | "receipt" | "prices" | "rates" | "products";
  roles: readonly MembershipRole[];
}[] = [
  { href: "/shopping-list", key: "shoppingList", roles: ["owner", "manager"] },
  { href: "/purchases", key: "purchases", roles: ["owner"] },
  { href: "/receipt", key: "receipt", roles: ["owner", "receiver"] },
  { href: "/prices", key: "prices", roles: ["owner", "manager"] },
  { href: "/rates", key: "rates", roles: ["owner"] },
  { href: "/products", key: "products", roles: ["owner"] },
];

/** Home entries to the screens of the active role (same rule as the sidebar). */
export function HomeShortcuts(): React.JSX.Element | null {
  const { activeMembership } = useRequireSession();
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const role = activeMembership?.role;
  const shortcuts = SHORTCUTS.filter((s) => role !== undefined && s.roles.includes(role));
  if (shortcuts.length === 0) return null;

  return (
    <nav aria-label={t("shortcuts")} className="space-y-3">
      {shortcuts.map((s) => (
        <Card key={s.href} className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{t(`${s.key}.title`)}</p>
            <p className="text-sm text-muted">{t(`${s.key}.description`)}</p>
          </div>
          <ButtonLink href={s.href} variant="secondary">
            {tc("open")}
          </ButtonLink>
        </Card>
      ))}
    </nav>
  );
}
