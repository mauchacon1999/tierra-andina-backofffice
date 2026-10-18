import type { Task } from "@ta/validators";

type OrderedTask = {
  id: string;
  status: Task["status"];
  isHighPriority: boolean;
  createdAt: string;
};

/** In progress, then an observation, then pending, then finished. */
const STATUS_RANK: Record<Task["status"], number> = {
  in_progress: 0,
  observation: 1,
  pending: 2,
  done: 3,
};

/** High priority first, then the status rank above, newest first inside each group. */
export function orderTasks<T extends OrderedTask>(tasks: readonly T[]): T[] {
  return [...tasks].sort((left, right) => {
    if (left.isHighPriority !== right.isHighPriority) return left.isHighPriority ? -1 : 1;
    const byStatus = STATUS_RANK[left.status] - STATUS_RANK[right.status];
    if (byStatus !== 0) return byStatus;
    if (left.createdAt !== right.createdAt) return left.createdAt < right.createdAt ? 1 : -1;
    return left.id < right.id ? 1 : -1;
  });
}
