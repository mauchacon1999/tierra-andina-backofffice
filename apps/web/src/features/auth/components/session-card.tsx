"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROLE_LABELS } from "@/features/auth/helpers/role-labels";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { useSignOutAction } from "@/features/auth/hooks/use-sign-out-action";

/** Who is signed in, in which store and with which role, plus "Salir". */
export function SessionCard(): React.JSX.Element | null {
  const { me, activeMembership } = useRequireSession();
  const { onSignOut, isSigningOut } = useSignOutAction();

  if (!me) return null;

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">Hola, {me.user.name}</p>
        <p className="text-sm text-muted">
          {activeMembership
            ? `${activeMembership.storeName} · ${ROLE_LABELS[activeMembership.role]}`
            : "Sin tienda asignada"}
        </p>
      </div>
      <Button
        variant="secondary"
        onClick={() => void onSignOut()}
        isLoading={isSigningOut}
        loadingText="Saliendo…"
      >
        Salir
      </Button>
    </Card>
  );
}
