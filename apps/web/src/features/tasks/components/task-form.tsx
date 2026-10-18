"use client";

import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useTaskForm } from "@/features/tasks/hooks/use-task-form";

export type TaskFormProps = {
  onCreated?: () => void;
  onCancel: () => void;
};

/** Name, description and who the task is assigned to. */
export function TaskForm({ onCreated, onCancel }: TaskFormProps): React.JSX.Element {
  const f = useTaskForm(onCreated);
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const { errors } = f.form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void f.onSubmit();
      }}
    >
      <h2 className="font-semibold">{t("addTitle")}</h2>
      {errors.root?.message && <Alert tone="error">{errors.root.message}</Alert>}
      <TextField
        label={t("name")}
        autoComplete="off"
        required
        error={errors.title?.message}
        {...f.form.register("title")}
      />
      <TextField
        label={t("description")}
        autoComplete="off"
        hint={tc("optional")}
        error={errors.description?.message}
        {...f.form.register("description")}
      />
      <SelectField
        label={t("assignee")}
        options={f.assigneeOptions}
        placeholder={t("assigneePlaceholder")}
        required
        error={errors.assigneeId?.message}
        {...f.form.register("assigneeId")}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button type="submit" isLoading={f.isSubmitting} loadingText={t("adding")}>
          {t("add")}
        </Button>
      </div>
    </form>
  );
}
