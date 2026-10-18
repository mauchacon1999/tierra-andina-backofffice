"use client";

import type { MembershipRole } from "@ta/validators";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { LoadingOverlay } from "@/components/shared/loading-overlay";
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
  const t = useTranslations();

  if (!me) return <LoadingOverlay />;
  if (!activeMembership || !roles.includes(activeMembership.role)) {
    return (
      <div className="space-y-4">
        <Alert tone="error" title={t("auth.roleGate.forbiddenTitle")}>
          {t("auth.roleGate.forbiddenBody")}
        </Alert>
        <ButtonLink href="/" variant="secondary">
          {t("common.backHome")}
        </ButtonLink>
      </div>
    );
  }
  return <>{children}</>;
}
