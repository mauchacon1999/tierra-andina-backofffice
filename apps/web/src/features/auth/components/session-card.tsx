"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { useSignOutAction } from "@/features/auth/hooks/use-sign-out-action";

/** Who is signed in, in which store and with which role, plus "Salir". */
export function SessionCard(): React.JSX.Element | null {
  const { me, activeMembership } = useRequireSession();
  const { onSignOut, isSigningOut } = useSignOutAction();
  const t = useTranslations("auth");

  if (!me) return null;

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{t("session.greeting", { name: me.user.name })}</p>
        <p className="text-sm text-muted">
          {activeMembership
            ? t("session.storeAndRole", {
                store: activeMembership.storeName,
                role: t(`roles.${activeMembership.role}`),
              })
            : t("session.noStore")}
        </p>
      </div>
      <Button
        variant="secondary"
        onClick={() => void onSignOut()}
        isLoading={isSigningOut}
        loadingText={t("session.signingOut")}
      >
        {t("session.signOut")}
      </Button>
    </Card>
  );
}
