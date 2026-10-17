import { type Executor, schema } from "@ta/db";
import { and, asc, eq, sql } from "drizzle-orm";

const { users, accounts, sessions, memberships } = schema;

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: (typeof memberships.$inferSelect)["role"];
  isActive: boolean;
  membershipId: string;
  createdAt: Date;
};

export type MembershipRecord = typeof memberships.$inferSelect;

const memberColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: memberships.role,
  isActive: memberships.isActive,
  membershipId: memberships.id,
  createdAt: memberships.createdAt,
};

/** Members of a store (active or not), owners first, then by name. */
export async function findMembers(db: Executor, storeId: string): Promise<MemberRow[]> {
  return db
    .select(memberColumns)
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.storeId, storeId))
    .orderBy(sql`${memberships.role} = 'owner' desc`, asc(users.name));
}

export async function findMember(
  db: Executor,
  storeId: string,
  userId: string,
): Promise<MemberRow | undefined> {
  const [row] = await db
    .select(memberColumns)
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.storeId, storeId), eq(memberships.userId, userId)))
    .limit(1);
  return row;
}

export async function findUserIdByEmail(db: Executor, email: string): Promise<string | undefined> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row?.id;
}

/** A user who signs in with email and password (Better Auth's credential account). */
export async function insertCredentialUser(
  db: Executor,
  values: { name: string; email: string; passwordHash: string },
): Promise<string> {
  const [user] = await db
    .insert(users)
    .values({ name: values.name, email: values.email, emailVerified: true })
    .returning({ id: users.id });
  if (!user) throw new Error("insert into users returned no row");
  await db.insert(accounts).values({
    accountId: user.id,
    providerId: "credential",
    userId: user.id,
    password: values.passwordHash,
  });
  return user.id;
}

export async function insertMembership(
  db: Executor,
  values: typeof memberships.$inferInsert,
): Promise<MembershipRecord> {
  const [row] = await db.insert(memberships).values(values).returning();
  if (!row) throw new Error("insert into memberships returned no row");
  return row;
}

export async function updateMembership(
  db: Executor,
  id: string,
  values: Partial<typeof memberships.$inferInsert>,
): Promise<MembershipRecord> {
  const [row] = await db.update(memberships).set(values).where(eq(memberships.id, id)).returning();
  if (!row) throw new Error(`update of membership ${id} returned no row`);
  return row;
}

export async function updateUserName(db: Executor, userId: string, name: string): Promise<void> {
  await db.update(users).set({ name }).where(eq(users.id, userId));
}

export async function updateCredentialPassword(
  db: Executor,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db
    .update(accounts)
    .set({ password: passwordHash })
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")));
}

/** Signs the user out everywhere (their next request answers 401). */
export async function deleteSessions(db: Executor, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
