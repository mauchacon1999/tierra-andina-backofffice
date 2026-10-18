import {
  taskAssigneeListSchema,
  taskListSchema,
  taskSchema,
  type CreateTask,
  type Task,
  type TaskAssigneeList,
  type TaskList,
  type UpdateTask,
} from "@ta/validators";

import { api } from "@/lib/api";

/** Tasks of the store, high priority and pending first. */
export function listTasks(): Promise<TaskList> {
  return api.get("/api/v1/tasks", { schema: taskListSchema });
}

/** Active people a task can be assigned to. */
export function listTaskAssignees(): Promise<TaskAssigneeList> {
  return api.get("/api/v1/tasks/assignees", { schema: taskAssigneeListSchema });
}

export function createTask(input: CreateTask): Promise<Task> {
  return api.post("/api/v1/tasks", input, { schema: taskSchema });
}

export function updateTask(id: string, input: UpdateTask): Promise<Task> {
  return api.patch(`/api/v1/tasks/${id}`, input, { schema: taskSchema });
}

export function deleteTask(id: string): Promise<void> {
  return api.delete(`/api/v1/tasks/${id}`);
}
