import { z } from "zod";

/** Roles per store (domain-model §7). Mirrors the `membership_role` enum in @ta/db. */
export const MEMBERSHIP_ROLES = ["owner", "manager", "receiver"] as const;

export const membershipRoleSchema = z.enum(MEMBERSHIP_ROLES);

export type MembershipRole = z.infer<typeof membershipRoleSchema>;

/** GET /api/v1/me — the signed-in user and the stores they can act in. */
export const meResponseSchema = z.object({
  user: z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.email(),
  }),
  memberships: z.array(
    z.object({
      storeId: z.uuid(),
      storeName: z.string(),
      role: membershipRoleSchema,
    }),
  ),
});

export type MeResponse = z.infer<typeof meResponseSchema>;
