"use client";

import { TASK_STATUSES, type Task, type TaskAssignee, type UpdateTask } from "@ta/validators";
import { Flag, GripVertical, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PointerEvent } from "react";

import { RowActionsMenu } from "@/components/shared/data-table/row-actions-menu";
import type { RowAction } from "@/components/shared/data-table/types";
import { IconButton } from "@/components/ui/icon-button";
import { avatarClass, personInitial, SelectMenu } from "@/components/ui/select-menu";
import { taskCardTone, taskStatusTone } from "@/features/tasks/helpers/task-tone";
import { cn } from "@/utils/cn";

export type TaskRowProps = {
  task: Task;
  assignees: TaskAssignee[];
  canManage: boolean;
  onUpdate: (id: string, input: UpdateTask) => void;
  onDelete: (id: string) => Promise<void>;
  onAction: (action: RowAction) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onGripPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onGripPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onGripPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
};

const ACCENT = {
  warning: "border-l-warning-border",
  success: "border-l-success-border",
  info: "border-l-info-border",
} as const;

const STATUS = {
  info: "border-info-border bg-info-soft text-info-text",
  chip: "border-chip-border bg-chip-soft text-chip-text",
  warning: "border-warning-border bg-warning-soft text-warning-text",
  success: "border-success-border bg-primary-soft text-primary-text",
} as const;

const DOT = {
  info: "bg-info-text",
  chip: "bg-chip-text",
  warning: "bg-warning-text",
  success: "bg-primary-text",
} as const;

function isTaskStatus(value: string): value is Task["status"] {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

/** One issue row: status on the left, priority flag, the work, who has it, then ⋯. */
export function TaskRow({
  task,
  assignees,
  canManage,
  onUpdate,
  onDelete,
  onAction,
  onMoveUp,
  onMoveDown,
  onGripPointerDown,
  onGripPointerMove,
  onGripPointerUp,
}: TaskRowProps): React.JSX.Element {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const tone = taskCardTone(task);
  const accent = tone === "warning" || tone === "success" ? ACCENT[tone] : ACCENT.info;
  const people = assignees.some((person) => person.id === task.assigneeId)
    ? assignees
    : [{ id: task.assigneeId, name: task.assigneeName }, ...assignees];
  const deleteAction: RowAction = {
    id: "delete",
    label: tc("delete"),
    icon: Trash2,
    tone: "danger",
    confirm: {
      question: t("deleteQuestion", { name: task.title }),
      confirmLabel: tc("delete"),
    },
    onSelect: () => onDelete(task.id),
  };

  return (
    <section
      aria-label={task.title}
      className={cn(
        "grid grid-cols-[auto_auto_auto_minmax(0,1fr)_auto_auto] items-center gap-2 border-l-4 px-3 py-2",
        "sm:grid-cols-[2.75rem_7.5rem_2.5rem_minmax(0,1fr)_2.75rem_2.75rem] sm:gap-3",
        accent,
      )}
    >
      <IconButton
        label={t("move", { name: task.title })}
        className="col-start-1 row-start-1 cursor-grab touch-none text-muted active:cursor-grabbing"
        onPointerDown={onGripPointerDown}
        onPointerMove={onGripPointerMove}
        onPointerUp={onGripPointerUp}
        onPointerCancel={onGripPointerUp}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          if (event.key === "ArrowUp") onMoveUp();
          else onMoveDown();
        }}
      >
        <GripVertical aria-hidden className="size-5" />
      </IconButton>
      <SelectMenu
        label={t("statusOf", { name: task.title })}
        value={task.status}
        options={TASK_STATUSES.map((status) => ({
          value: status,
          label: t(`status.${status}`),
          dotClassName: DOT[taskStatusTone(status)],
        }))}
        onValueChange={(status) => {
          if (isTaskStatus(status)) onUpdate(task.id, { status });
        }}
        className="col-start-2 row-start-1 w-full max-w-40"
        buttonClassName={cn("rounded-full", STATUS[taskStatusTone(task.status)])}
      />
      {canManage ? (
        <IconButton
          label={task.isHighPriority ? t("clearPriority") : t("markPriority")}
          aria-pressed={task.isHighPriority}
          className="col-start-3 row-start-1"
          onClick={() => onUpdate(task.id, { isHighPriority: !task.isHighPriority })}
        >
          <Flag
            aria-hidden
            className={task.isHighPriority ? "fill-current text-warning-text" : "text-muted"}
          />
        </IconButton>
      ) : (
        <span className="col-start-3 row-start-1 inline-flex size-11 items-center justify-center">
          {task.isHighPriority ? (
            <>
              <Flag aria-hidden className="fill-current text-warning-text" />
              <span className="sr-only">{t("highPriority")}</span>
            </>
          ) : null}
        </span>
      )}
      <div className="col-start-4 row-start-1 min-w-0">
        <p className="truncate font-medium">{task.title}</p>
        {task.description && <p className="truncate text-sm text-muted">{task.description}</p>}
      </div>
      {canManage ? (
        <SelectMenu
          appearance="avatar"
          label={t("assigneeOf", { name: task.title })}
          value={task.assigneeId}
          options={people.map((person) => ({ value: person.id, label: person.name }))}
          onValueChange={(assigneeId) => onUpdate(task.id, { assigneeId })}
          className="col-start-5 row-start-1"
        />
      ) : (
        <span
          className={cn(
            "col-start-5 row-start-1 inline-flex size-11 items-center justify-center rounded-full text-sm font-semibold",
            avatarClass(task.assigneeName),
          )}
        >
          <span aria-hidden>{personInitial(task.assigneeName)}</span>
          <span className="sr-only">{task.assigneeName}</span>
        </span>
      )}
      <div className="col-start-6 row-start-1 justify-self-end">
        {canManage && (
          <RowActionsMenu rowName={task.title} actions={[deleteAction]} onSelect={onAction} />
        )}
      </div>
    </section>
  );
}
