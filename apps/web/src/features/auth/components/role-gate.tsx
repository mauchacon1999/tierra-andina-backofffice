"use client";

import type { MembershipRole } from "@ta/validators";
import type { ReactNode } from "react";

import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button-link";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";

export type RoleGateProps = {
  roles: MembershipRole[];
  children: ReactNode;
};

/**
 * Shows its children only to signed-in users with one of `roles` in the active store.
 * The API enforces the same rule; this only avoids showing screens that would fail.
 */
export function RoleGate({ roles, children }: RoleGateProps): React.JSX.Element {
  const { me, activeMembership } = useRequireSession();

  if (!me) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }
  if (!activeMembership || !roles.includes(activeMembership.role)) {
    return (
      <div className="space-y-4">
        <Alert tone="error" title="No tienes permiso para ver esta sección">
          Pídele acceso al dueño de la tienda.
        </Alert>
        <ButtonLink href="/" variant="secondary">
          Volver al inicio
        </ButtonLink>
      </div>
    );
  }
  return <>{children}</>;
}
