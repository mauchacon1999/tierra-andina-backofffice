"use client";

import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/features/auth/helpers/role-labels";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { useSignOutAction } from "@/features/auth/hooks/use-sign-out-action";

/** Who is signed in, in which store and with which role, plus "Salir". */
export function SessionCard(): React.JSX.Element | null {
  const { me, activeMembership } = useRequireSession();
  const { onSignOut, isSigningOut } = useSignOutAction();

  if (!me) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700 dark:bg-zinc-900">
      <div>
        <p className="font-semibold">Hola, {me.user.name}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {activeMembership
            ? `${activeMembership.storeName} · ${ROLE_LABELS[activeMembership.role]}`
            : "Sin tienda asignada"}
        </p>
      </div>
      <Button variant="secondary" onClick={() => void onSignOut()} disabled={isSigningOut}>
        {isSigningOut ? "Saliendo…" : "Salir"}
      </Button>
    </section>
  );
}
