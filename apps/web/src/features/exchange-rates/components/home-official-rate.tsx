"use client";

import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import { OfficialRateCard } from "@/features/exchange-rates/components/official-rate-card";

/** The official BCV box on the home screen. Only the owner sets the day's rates. */
export function HomeOfficialRate(): React.JSX.Element | null {
  const { activeMembership } = useRequireSession();
  if (activeMembership?.role !== "owner") return null;
  return <OfficialRateCard />;
}
