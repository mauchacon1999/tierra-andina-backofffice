"use client";

import type { CreateTask, Task, TaskAssignee, TaskList, UpdateTask } from "@ta/validators";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import {
  createTask,
  deleteTask,
  listTaskAssignees,
  listTasks,
  updateTask,
} from "@/features/tasks/api/task-requests";
import type { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

const NO_TASKS: Task[] = [];
const NO_ASSIGNEES: TaskAssignee[] = [];

export type UseTasksResult = {
  tasks: Task[];
  isLoading: boolean;
  error: ApiError | undefined;
  retry: () => void;
};

/** The store's tasks. */
export function useTasks(): UseTasksResult {
  const { data, error, isLoading, mutate } = useSWR<TaskList, ApiError>(queryKeys.tasks, listTasks);
  return { tasks: data?.data ?? NO_TASKS, isLoading, error, retry: () => void mutate() };
}

/** People the form can assign a task to. Skipped when the role cannot create tasks. */
export function useTaskAssignees(enabled: boolean): TaskAssignee[] {
  const { data } = useSWR(enabled ? queryKeys.taskAssignees : null, listTaskAssignees);
  return data?.data ?? NO_ASSIGNEES;
}

async function refreshTasks(mutate: ReturnType<typeof useSWRConfig>["mutate"]): Promise<void> {
  await mutate(queryKeys.tasks);
}

/** Adds a task and reloads the list. */
export function useCreateTask(): {
  run: (input: CreateTask) => Promise<Task>;
  isRunning: boolean;
} {
  const { mutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation<Task, ApiError, readonly string[], CreateTask>(
    ["tasks", "mutation", "create"],
    (_key, { arg }) => createTask(arg),
  );
  return {
    run: async (input) => {
      const task = await trigger(input);
      await refreshTasks(mutate);
      return task;
    },
    isRunning: isMutating,
  };
}

/** Changes status, priority or the assignment, then reloads the list. */
export function useUpdateTask(): {
  run: (id: string, input: UpdateTask) => Promise<Task>;
  isRunning: boolean;
} {
  const { mutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation<
    Task,
    ApiError,
    readonly string[],
    { id: string; input: UpdateTask }
  >(["tasks", "mutation", "update"], (_key, { arg }) => updateTask(arg.id, arg.input));
  return {
    run: async (id, input) => {
      const task = await trigger({ id, input });
      await refreshTasks(mutate);
      return task;
    },
    isRunning: isMutating,
  };
}

/** Removes a task and reloads the list. */
export function useDeleteTask(): {
  run: (id: string) => Promise<void>;
} {
  const { mutate } = useSWRConfig();
  const { trigger } = useSWRMutation<void, ApiError, readonly string[], string>(
    ["tasks", "mutation", "delete"],
    (_key, { arg }) => deleteTask(arg),
  );
  return {
    run: async (id) => {
      await trigger(id);
      await refreshTasks(mutate);
    },
  };
}
