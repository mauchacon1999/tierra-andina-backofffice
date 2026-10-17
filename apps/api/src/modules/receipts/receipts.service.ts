import type { Database } from "@ta/db";

import type { Membership } from "@/lib/types";
import { getStoreSettings } from "@/modules/settings/settings.service";

/**
 * Whether this member sees purchase prices on the truck receipt screen: the owner always, a
 * receiver only when the store enables `receiverCanSeePrices` (domain-model §4).
 */
export async function canSeePrices(db: Database, membership: Membership): Promise<boolean> {
  if (membership.role === "owner") return true;
  return (await getStoreSettings(db, membership.storeId)).receiverCanSeePrices;
}
