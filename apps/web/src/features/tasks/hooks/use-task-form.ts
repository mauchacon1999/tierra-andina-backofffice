"use client";

import { createTaskSchema, type CreateTask, type CreateTaskInput } from "@ta/validators";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import type { SelectOption } from "@/components/ui/select-field";
import { useCreateTask, useTaskAssignees } from "@/features/tasks/api/use-tasks";
import { useErrorMessage } from "@/i18n/use-error-message";
import { useZodResolver } from "@/i18n/use-zod-resolver";
import { isApiError } from "@/lib/api";

const EMPTY: CreateTaskInput = { title: "", description: "", assigneeId: "" };

export type UseTaskFormResult = {
  form: ReturnType<typeof useForm<CreateTaskInput, unknown, CreateTask>>;
  assigneeOptions: SelectOption[];
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
};

/** Creates a pending task assigned to someone in the store. */
export function useTaskForm(onCreated?: () => void): UseTaskFormResult {
  const t = useTranslations("tasks");
  const errorMessage = useErrorMessage();
  const form = useForm<CreateTaskInput, unknown, CreateTask>({
    resolver: useZodResolver(createTaskSchema),
    defaultValues: EMPTY,
  });
  const assignees = useTaskAssignees(true);
  const create = useCreateTask();

  const assigneeOptions = useMemo(
    () => assignees.map((person) => ({ value: person.id, label: person.name })),
    [assignees],
  );

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await create.run({
        ...input,
        description: input.description || undefined,
      });
      form.reset(EMPTY);
      onCreated?.();
    } catch (error) {
      form.setError("root", {
        message: isApiError(error) ? errorMessage(error, t("saveFailed")) : t("saveFailed"),
      });
    }
  });

  return { form, assigneeOptions, onSubmit, isSubmitting: create.isRunning };
}
