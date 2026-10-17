"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useRequireSession } from "@/features/auth/hooks/use-require-session";

export type SessionGateProps = {
  children: ReactNode;
};

/** Renders its children only for a signed-in user; otherwise the hook redirects to /login. */
export function SessionGate({ children }: SessionGateProps): React.JSX.Element {
  const { me } = useRequireSession();
  const t = useTranslations("common");

  if (!me) {
    return (
      <p role="status" className="text-muted">
        {t("loading")}
      </p>
    );
  }
  return <>{children}</>;
}
