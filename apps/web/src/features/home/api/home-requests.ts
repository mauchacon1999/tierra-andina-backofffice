import { homeBriefingSchema, type HomeBriefing } from "@ta/validators";

import { api } from "@/lib/api";

/** The owner's briefing: this week, debts, fiados and the alerts that are true. */
export function getHomeBriefing(): Promise<HomeBriefing> {
  return api.get("/api/v1/home", { schema: homeBriefingSchema });
}
