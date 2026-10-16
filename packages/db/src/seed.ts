import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";

import type { Database } from "./client";
import {
  accounts,
  expenseCategories,
  memberships,
  paymentMethods,
  productCategories,
  settings,
  stores,
  users,
} from "./schema";
import {
  SEED_EXPENSE_CATEGORIES,
  SEED_PAYMENT_METHODS,
  SEED_PRODUCT_CATEGORIES,
  SEED_SETTINGS,
  SEED_STORE,
} from "./seed-data";

export type SeedOptions = {
  ownerEmail: string;
  ownerPassword: string;
  ownerName?: string;
};

export type SeedResult = {
  storeId: string;
  ownerId: string;
};

/**
 * Loads the initial data (domain-model §9.10). Idempotent: running it again inserts nothing new
 * and never changes existing rows (an existing owner keeps its password). Runs in one transaction.
 */
export async function seed(db: Database, options: SeedOptions): Promise<SeedResult> {
  const email = options.ownerEmail.trim().toLowerCase();
  // Hash outside the transaction: scrypt is slow and needs no database.
  const passwordHash = await hashPassword(options.ownerPassword);

  return db.transaction(async (tx) => {
    const existingStore = await tx.query.stores.findFirst({
      where: eq(stores.name, SEED_STORE.name),
    });
    const store = existingStore ?? (await tx.insert(stores).values(SEED_STORE).returning())[0];
    if (!store) throw new Error("[seed] could not create the store");

    let owner = await tx.query.users.findFirst({ where: eq(users.email, email) });
    if (!owner) {
      [owner] = await tx
        .insert(users)
        .values({ name: options.ownerName ?? "Dueño", email, emailVerified: true })
        .returning();
      if (!owner) throw new Error("[seed] could not create the owner user");
      // Same shape Better Auth's email sign-up writes: a "credential" account keyed by user id.
      await tx.insert(accounts).values({
        accountId: owner.id,
        providerId: "credential",
        userId: owner.id,
        password: passwordHash,
      });
    }

    await tx
      .insert(memberships)
      .values({ userId: owner.id, storeId: store.id, role: "owner" })
      .onConflictDoNothing({ target: [memberships.userId, memberships.storeId] });

    await tx
      .insert(settings)
      .values(
        Object.entries(SEED_SETTINGS).map(([key, value]) => ({ storeId: store.id, key, value })),
      )
      .onConflictDoNothing({ target: [settings.storeId, settings.key] });

    await tx
      .insert(paymentMethods)
      .values([...SEED_PAYMENT_METHODS])
      .onConflictDoNothing({ target: paymentMethods.code });

    await tx
      .insert(productCategories)
      .values([...SEED_PRODUCT_CATEGORIES])
      .onConflictDoNothing({ target: productCategories.code });

    await tx
      .insert(expenseCategories)
      .values([...SEED_EXPENSE_CATEGORIES])
      .onConflictDoNothing({ target: expenseCategories.code });

    return { storeId: store.id, ownerId: owner.id };
  });
}
