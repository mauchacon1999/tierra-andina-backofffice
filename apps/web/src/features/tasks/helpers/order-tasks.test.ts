import { describe, expect, it } from "vitest";

import { orderTasks } from "@/features/tasks/helpers/order-tasks";

describe("orderTasks", () => {
  it("keeps high priority first, then in progress, observation, pending and finished", () => {
    const ordered = orderTasks([
      { id: "old", status: "pending" as const, isHighPriority: false, createdAt: "2026-10-01" },
      { id: "done", status: "done" as const, isHighPriority: false, createdAt: "2026-10-18" },
      { id: "urgent-done", status: "done" as const, isHighPriority: true, createdAt: "2026-10-02" },
      {
        id: "note",
        status: "observation" as const,
        isHighPriority: false,
        createdAt: "2026-10-20",
      },
      {
        id: "course",
        status: "in_progress" as const,
        isHighPriority: false,
        createdAt: "2026-09-01",
      },
      { id: "new", status: "pending" as const, isHighPriority: false, createdAt: "2026-10-18" },
    ]);

    expect(ordered.map((task) => task.id)).toEqual([
      "urgent-done",
      "course",
      "note",
      "new",
      "old",
      "done",
    ]);
  });
});
