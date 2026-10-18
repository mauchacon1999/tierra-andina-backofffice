"use client";

import type { ReactNode } from "react";

import { LoadingOverlay } from "@/components/shared/loading-overlay";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";

export type SessionGateProps = {
  children: ReactNode;
};

/** Renders its children only for a signed-in user; otherwise the hook redirects to /login. */
export function SessionGate({ children }: SessionGateProps): React.JSX.Element {
  const { me } = useRequireSession();

  if (!me) return <LoadingOverlay />;
  return <>{children}</>;
}
