import type { Database } from "@ta/db";
import type { CreateStaffUser, SetUserPassword, StaffUser, UpdateStaffUser } from "@ta/validators";
import { hashPassword } from "better-auth/crypto";

import { recordAudit } from "@/lib/audit";
import { AppError, ErrorCode } from "@/lib/errors";
import type { Actor } from "@/lib/types";

import {
  deleteSessions,
  findMember,
  findMembers,
  findUserIdByEmail,
  insertCredentialUser,
  insertMembership,
  updateCredentialPassword,
  updateMembership,
  updateUserName,
  type MemberRow,
} from "./users.repository";

/*
 * Users of the store: the owner creates managers and receivers, changes their role and access,
 * and sets their password (only the owner manages passwords; no emails). Owners — including
 * the signed-in one — are not changed from here.
 */

export function listUsers(db: Database, storeId: string): Promise<MemberRow[]> {
  return findMembers(db, storeId);
}

async function requireStaff(db: Database, actor: Actor, userId: string): Promise<MemberRow> {
  const member = await findMember(db, actor.storeId, userId);
  if (!member) throw new AppError(ErrorCode.USER_NOT_FOUND, "El usuario no existe en esta tienda");
  if (member.role === "owner") {
    throw new AppError(ErrorCode.CANNOT_CHANGE_OWNER, "Los dueños no se modifican desde aquí");
  }
  return member;
}

/**
 * Creates a manager or receiver who signs in with the owner's password. Audited (the password
 * hash is never written to the audit log).
 * @throws AppError EMAIL_TAKEN
 */
export async function createStaffUser(
  db: Database,
  actor: Actor,
  input: CreateStaffUser,
): Promise<MemberRow> {
  if (await findUserIdByEmail(db, input.email)) {
    throw new AppError(ErrorCode.EMAIL_TAKEN, "Ya hay un usuario con ese correo", undefined, {
      fieldErrors: { email: ["Ya hay un usuario con ese correo"] },
    });
  }
  const passwordHash = await hashPassword(input.password);
  const userId = await db.transaction(async (tx) => {
    const id = await insertCredentialUser(tx, {
      name: input.name,
      email: input.email,
      passwordHash,
    });
    const membership = await insertMembership(tx, {
      userId: id,
      storeId: actor.storeId,
      role: input.role,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      tableName: "memberships",
      recordId: membership.id,
      action: "insert",
      changes: { userId: id, name: input.name, email: input.email, role: input.role },
    });
    return id;
  });
  const created = await findMember(db, actor.storeId, userId);
  if (!created) throw new Error(`user ${userId} vanished`);
  return created;
}

/**
 * Name, role or access of a manager/receiver. Deactivating signs them out at once.
 * @throws AppError USER_NOT_FOUND, CANNOT_CHANGE_OWNER
 */
export async function updateStaffUser(
  db: Database,
  actor: Actor,
  userId: string,
  input: UpdateStaffUser,
): Promise<MemberRow> {
  const before = await requireStaff(db, actor, userId);
  await db.transaction(async (tx) => {
    if (input.name !== undefined) await updateUserName(tx, userId, input.name);
    if (input.role !== undefined || input.isActive !== undefined) {
      await updateMembership(tx, before.membershipId, {
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedBy: actor.userId,
      });
    }
    if (input.isActive === false) await deleteSessions(tx, userId);
    await recordAudit(tx, actor, {
      tableName: "memberships",
      recordId: before.membershipId,
      action: "update",
      changes: {
        ...(input.name !== undefined ? { name: { from: before.name, to: input.name } } : {}),
        ...(input.role !== undefined ? { role: { from: before.role, to: input.role } } : {}),
        ...(input.isActive !== undefined
          ? { isActive: { from: before.isActive, to: input.isActive } }
          : {}),
      },
    });
  });
  const after = await findMember(db, actor.storeId, userId);
  if (!after) throw new Error(`user ${userId} vanished`);
  return after;
}

/**
 * The owner sets a new password for a manager/receiver; they are signed out everywhere.
 * @throws AppError USER_NOT_FOUND, CANNOT_CHANGE_OWNER
 */
export async function setUserPassword(
  db: Database,
  actor: Actor,
  userId: string,
  input: SetUserPassword,
): Promise<void> {
  const member = await requireStaff(db, actor, userId);
  const passwordHash = await hashPassword(input.password);
  await db.transaction(async (tx) => {
    await updateCredentialPassword(tx, userId, passwordHash);
    await deleteSessions(tx, userId);
    await recordAudit(tx, actor, {
      tableName: "memberships",
      recordId: member.membershipId,
      action: "update",
      changes: { password: "changed by the owner" },
    });
  });
}

export function toStaffUserDto(row: MemberRow, actor: { userId: string }): StaffUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    isSelf: row.id === actor.userId,
    createdAt: row.createdAt.toISOString(),
  };
}
