"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { useSignOutAction } from "@/features/auth/hooks/use-sign-out-action";
import { cn } from "@/utils/cn";

export type SidebarUserProps = {
  isCollapsed: boolean;
};

/** Who is signed in, the store and role, and "Salir" (bottom of the sidebar). */
export function SidebarUser({ isCollapsed }: SidebarUserProps): React.JSX.Element | null {
  const { me, activeMembership } = useRequireSession();
  const { onSignOut, isSigningOut } = useSignOutAction();
  const t = useTranslations("auth");

  if (!me) return null;
  const signOut = isSigningOut ? t("session.signingOut") : t("session.signOut");

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-border p-3",
        isCollapsed && "flex-col",
      )}
    >
      {!isCollapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{me.user.name}</p>
          <p className="truncate text-xs text-muted">
            {activeMembership
              ? t("session.storeAndRole", {
                  store: activeMembership.storeName,
                  role: t(`roles.${activeMembership.role}`),
                })
              : t("session.noStore")}
          </p>
        </div>
      )}
      <Tooltip label={signOut} isDisabled={!isCollapsed}>
        <IconButton label={signOut} disabled={isSigningOut} onClick={() => void onSignOut()}>
          <LogOut aria-hidden className="size-5" />
        </IconButton>
      </Tooltip>
    </div>
  );
}
