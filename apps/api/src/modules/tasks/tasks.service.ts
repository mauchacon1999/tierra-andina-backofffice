import type { Database, Executor } from "@ta/db";
import type { CreateTask, MembershipRole, Task, UpdateTask } from "@ta/validators";

import { diffChanges, recordAudit } from "@/lib/audit";
import { AppError, ErrorCode } from "@/lib/errors";
import type { Actor } from "@/lib/types";

import {
  findAssignees,
  findTask,
  findTasks,
  deleteTaskById,
  insertTask,
  updateTaskById,
  type TaskRow,
} from "./tasks.repository";

const TABLE = "tasks";

export function toTaskDto(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    status: row.status,
    isHighPriority: row.isHighPriority,
    createdAt: row.createdAt.toISOString(),
  };
}

/** People a task can be assigned to (active members of the store). */
export async function listAssignees(
  db: Executor,
  storeId: string,
): Promise<{ id: string; name: string }[]> {
  return findAssignees(db, storeId);
}

/** Every task of the store: high priority first, then in progress, observation, pending and finished. */
export async function listTasks(db: Executor, storeId: string): Promise<TaskRow[]> {
  return findTasks(db, storeId);
}

/**
 * Creates a pending task for an active member. Audited with the inserted row.
 * @throws AppError ASSIGNEE_NOT_FOUND
 */
export async function createTask(db: Database, actor: Actor, input: CreateTask): Promise<TaskRow> {
  await requireAssignee(db, actor.storeId, input.assigneeId);
  return db.transaction(async (tx) => {
    const row = await insertTask(tx, {
      storeId: actor.storeId,
      title: input.title,
      description: input.description || null,
      assigneeId: input.assigneeId,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    const { assigneeName: _name, ...record } = row;
    await recordAudit(tx, actor, {
      tableName: TABLE,
      recordId: row.id,
      action: "insert",
      changes: record,
    });
    return row;
  });
}

/**
 * Changes a task. The owner and the manager can change any field; a receiver can only
 * change the status. Audited with the difference.
 * @throws AppError TASK_NOT_FOUND, ASSIGNEE_NOT_FOUND, FORBIDDEN
 */
export async function updateTask(
  db: Database,
  actor: Actor & { role: MembershipRole },
  id: string,
  input: UpdateTask,
): Promise<TaskRow> {
  const before = await findTask(db, actor.storeId, id);
  if (!before) throw new AppError(ErrorCode.TASK_NOT_FOUND, "La tarea no existe");
  assertReceiverOnlyChangesStatus(actor.role, input);
  if (input.assigneeId) await requireAssignee(db, actor.storeId, input.assigneeId);

  const { assigneeName: _name, ...beforeRecord } = before;
  return db.transaction(async (tx) => {
    await updateTaskById(tx, id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.isHighPriority !== undefined ? { isHighPriority: input.isHighPriority } : {}),
      updatedBy: actor.userId,
    });
    const after = await findTask(tx, actor.storeId, id);
    if (!after) throw new Error("task missing after update");
    const { assigneeName: _afterName, ...afterRecord } = after;
    await recordAudit(tx, actor, {
      tableName: TABLE,
      recordId: id,
      action: "update",
      changes: diffChanges(beforeRecord, afterRecord),
    });
    return after;
  });
}

/**
 * Removes a task. The owner and the manager can delete one; the deletion is audited.
 * @throws AppError TASK_NOT_FOUND
 */
export async function deleteTask(db: Database, actor: Actor, id: string): Promise<void> {
  const before = await findTask(db, actor.storeId, id);
  if (!before) throw new AppError(ErrorCode.TASK_NOT_FOUND, "La tarea no existe");
  const { assigneeName: _name, ...record } = before;
  await db.transaction(async (tx) => {
    await recordAudit(tx, actor, {
      tableName: TABLE,
      recordId: id,
      action: "delete",
      changes: record,
    });
    await deleteTaskById(tx, id);
  });
}

async function requireAssignee(db: Executor, storeId: string, userId: string): Promise<void> {
  const people = await findAssignees(db, storeId);
  if (!people.some((person) => person.id === userId)) {
    throw new AppError(ErrorCode.ASSIGNEE_NOT_FOUND, "Esa persona no está en la tienda");
  }
}

/** A receiver only moves the status; they do not rewrite the task or reassign it. */
function assertReceiverOnlyChangesStatus(role: MembershipRole, input: UpdateTask): void {
  if (role !== "receiver") return;
  const { status: _status, ...rest } = input;
  if (Object.values(rest).some((value) => value !== undefined)) {
    throw new AppError(ErrorCode.FORBIDDEN, "No tienes permiso para esta acción");
  }
}
