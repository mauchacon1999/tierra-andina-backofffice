import { z } from "zod";

import { message } from "./messages";

/** Shop tasks: a name, who has it, and where it stands. */
export const TASK_STATUSES = ["pending", "in_progress", "observation", "done"] as const;
export const TASK_TITLE_MAX = 80;
export const TASK_DESCRIPTION_MAX = 500;

const titleSchema = z
  .string({ error: message("name.required") })
  .trim()
  .min(1, { message: message("name.required"), abort: true })
  .min(2, message("name.tooShort", { min: 2 }))
  .max(TASK_TITLE_MAX, message("name.tooLong", { max: TASK_TITLE_MAX }));

const descriptionSchema = z
  .string()
  .trim()
  .max(TASK_DESCRIPTION_MAX, message("text.tooLong", { max: TASK_DESCRIPTION_MAX }));

export const taskStatusSchema = z.enum(TASK_STATUSES);

/** POST /api/v1/tasks — a new pending task assigned to someone in the store. */
export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  assigneeId: z.uuid({ error: message("task.assigneeRequired") }),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type CreateTask = z.output<typeof createTaskSchema>;

/** PATCH /api/v1/tasks/:id — any of the fields. A receiver may send only `status`. */
export const updateTaskSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.nullable().optional(),
    assigneeId: z.uuid({ error: message("task.assigneeRequired") }).optional(),
    status: taskStatusSchema.optional(),
    isHighPriority: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: message("noChanges"),
  });

export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
export type UpdateTask = z.output<typeof updateTaskSchema>;

export const taskSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  assigneeId: z.uuid(),
  assigneeName: z.string(),
  status: taskStatusSchema,
  isHighPriority: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
});

export type Task = z.infer<typeof taskSchema>;

export const taskListSchema = z.object({ data: z.array(taskSchema) });
export type TaskList = z.infer<typeof taskListSchema>;

export const taskAssigneeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export type TaskAssignee = z.infer<typeof taskAssigneeSchema>;

export const taskAssigneeListSchema = z.object({ data: z.array(taskAssigneeSchema) });
export type TaskAssigneeList = z.infer<typeof taskAssigneeListSchema>;
