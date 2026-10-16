import { type Executor, schema } from "@ta/db";
import type { MembershipRole } from "@ta/validators";
import { and, asc, eq } from "drizzle-orm";

const { memberships, stores } = schema;

export type ActiveMembership = {
  storeId: string;
  storeName: string;
  role: MembershipRole;
};

/** Active memberships of a user in active stores, ordered by store name. */
export async function findActiveMemberships(
  db: Executor,
  userId: string,
): Promise<ActiveMembership[]> {
  return db
    .select({ storeId: stores.id, storeName: stores.name, role: memberships.role })
    .from(memberships)
    .innerJoin(stores, eq(stores.id, memberships.storeId))
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.isActive, true),
        eq(stores.isActive, true),
      ),
    )
    .orderBy(asc(stores.name));
}
