import type { Task } from "@ta/validators";

import type { CardTone } from "@/components/ui/card";

/** High priority paints the row orange; a finished one is green; the rest stay blue. */
export function taskCardTone(task: { status: Task["status"]; isHighPriority: boolean }): CardTone {
  if (task.isHighPriority) return "warning";
  if (task.status === "done") return "success";
  return "info";
}

/** Color of the status control: blue, violet, amber, green. */
export function taskStatusTone(status: Task["status"]): "info" | "chip" | "warning" | "success" {
  if (status === "in_progress") return "chip";
  if (status === "observation") return "warning";
  if (status === "done") return "success";
  return "info";
}
