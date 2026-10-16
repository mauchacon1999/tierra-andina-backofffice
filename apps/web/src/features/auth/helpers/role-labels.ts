import type { MembershipRole } from "@ta/validators";

/** Spanish labels for roles, as the shop calls them. */
export const ROLE_LABELS = {
  owner: "Dueño",
  manager: "Encargado",
  receiver: "Receptor",
} as const satisfies Record<MembershipRole, string>;
