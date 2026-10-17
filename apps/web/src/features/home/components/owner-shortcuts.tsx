"use client";

import { useTranslations } from "next-intl";

import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";

const SHORTCUTS = [
  { href: "/purchases", key: "purchases" },
  { href: "/rates", key: "rates" },
  { href: "/products", key: "products" },
] as const;

/** Home entries to the owner screens, shown to owners only. */
export function OwnerShortcuts(): React.JSX.Element | null {
  const { activeMembership } = useRequireSession();
  const t = useTranslations("home");
  const tc = useTranslations("common");
  if (activeMembership?.role !== "owner") return null;

  return (
    <nav aria-label={t("shortcuts")} className="space-y-3">
      {SHORTCUTS.map((s) => (
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
