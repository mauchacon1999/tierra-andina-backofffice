"use client";

import { useRef, useState, type PointerEvent } from "react";
import { useTranslations } from "next-intl";

import { useRowActionRunner } from "@/components/shared/data-table/use-row-action-runner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRequireSession } from "@/features/auth/hooks/use-require-session";
import {
  useDeleteTask,
  useTaskAssignees,
  useTasks,
  useUpdateTask,
} from "@/features/tasks/api/use-tasks";
import { TaskForm } from "@/features/tasks/components/task-form";
import { TaskRow } from "@/features/tasks/components/task-row";
import { orderTasks } from "@/features/tasks/helpers/order-tasks";
import { useStoredOrder } from "@/hooks/use-stored-order";
import { useErrorMessage } from "@/i18n/use-error-message";

/** The store's tasks, listed like a board: urgent first, create hidden until asked. */
export function TasksScreen(): React.JSX.Element {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const { activeMembership } = useRequireSession();
  const list = useTasks();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const actions = useRowActionRunner();
  const [isFormOpen, setFormOpen] = useState(false);
  const canManage = activeMembership?.role === "owner" || activeMembership?.role === "manager";
  const assignees = useTaskAssignees(canManage);
  const ranked = orderTasks(list.tasks);
  const order = useStoredOrder(
    `ta.tasks.order.${activeMembership?.storeId ?? "none"}`,
    ranked.map((task) => task.id),
  );
  const byId = new Map(ranked.map((task) => [task.id, task]));
  const tasks = order.ids.flatMap((id) => {
    const task = byId.get(id);
    return task ? [task] : [];
  });
  const listRef = useRef<HTMLUListElement>(null);
  const dragFrom = useRef<number | null>(null);

  const rowAt = (event: PointerEvent<HTMLButtonElement>): number | null => {
    const root = listRef.current;
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest("li");
    if (!root || !hit || !root.contains(hit)) return null;
    const index = Number((hit as HTMLElement).dataset.index);
    return Number.isInteger(index) ? index : null;
  };

  return (
    <div className="space-y-4">
      {canManage &&
        (isFormOpen ? (
          <Card>
            <TaskForm onCreated={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
          </Card>
        ) : (
          <Button type="button" onClick={() => setFormOpen(true)}>
            {t("new")}
          </Button>
        ))}
      {list.error && (
        <Alert tone="error" title={t("loadFailed")}>
          <p>{errorMessage(list.error, list.error.message)}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={list.retry}>
            {tc("retry")}
          </Button>
        </Alert>
      )}
      {list.isLoading && (
        <p role="status" className="text-muted">
          {tc("loading")}
        </p>
      )}
      {!list.isLoading && tasks.length === 0 && !list.error && (
        <p className="text-muted">{t("empty")}</p>
      )}
      {tasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted">{t("reorderHint")}</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="hidden grid-cols-[2.75rem_7.5rem_2.5rem_minmax(0,1fr)_2.75rem_2.75rem] gap-3 bg-surface-muted px-3 py-2 text-sm font-medium text-muted sm:grid">
              <span className="sr-only">{t("columns.order")}</span>
              <span>{t("columns.status")}</span>
              <span className="sr-only">{t("columns.priority")}</span>
              <span>{t("columns.name")}</span>
              <span className="sr-only">{t("columns.assignee")}</span>
              <span className="sr-only">{t("columns.actions")}</span>
            </div>
            <ul ref={listRef} aria-label={t("listLabel")}>
              {tasks.map((task, index) => (
                <li
                  key={task.id}
                  data-index={index}
                  className="border-t border-border first:border-t-0"
                >
                  <TaskRow
                    task={task}
                    assignees={assignees}
                    canManage={canManage}
                    onUpdate={(id, input) => void update.run(id, input)}
                    onDelete={remove.run}
                    onAction={actions.select}
                    onMoveUp={() => order.move(index, index - 1)}
                    onMoveDown={() => order.move(index, index + 1)}
                    onGripPointerDown={(event) => {
                      if (event.button !== 0) return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      dragFrom.current = index;
                    }}
                    onGripPointerMove={(event) => {
                      const from = dragFrom.current;
                      if (from === null) return;
                      const to = rowAt(event);
                      if (to === null || to === from) return;
                      order.move(from, to);
                      dragFrom.current = to;
                    }}
                    onGripPointerUp={() => {
                      dragFrom.current = null;
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={actions.pending !== null}
        question={actions.pending?.confirm?.question ?? ""}
        confirmLabel={actions.pending?.confirm?.confirmLabel ?? tc("confirm")}
        tone="danger"
        isLoading={actions.isRunning}
        loadingText={t("deleting")}
        onConfirm={() => void actions.confirm()}
        onCancel={actions.cancel}
      />
    </div>
  );
}
