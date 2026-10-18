import { describe, expect, it } from "vitest";

import { taskCardTone, taskStatusTone } from "@/features/tasks/helpers/task-tone";

describe("taskCardTone", () => {
  it("uses orange for high priority, green when finished and blue otherwise", () => {
    expect(taskCardTone({ status: "pending", isHighPriority: true })).toBe("warning");
    expect(taskCardTone({ status: "done", isHighPriority: true })).toBe("warning");
    expect(taskCardTone({ status: "in_progress", isHighPriority: true })).toBe("warning");
    expect(taskCardTone({ status: "done", isHighPriority: false })).toBe("success");
    expect(taskCardTone({ status: "pending", isHighPriority: false })).toBe("info");
    expect(taskCardTone({ status: "observation", isHighPriority: false })).toBe("info");
  });
});

describe("taskStatusTone", () => {
  it("paints pending blue, in progress violet, an observation amber and finished green", () => {
    expect(taskStatusTone("pending")).toBe("info");
    expect(taskStatusTone("in_progress")).toBe("chip");
    expect(taskStatusTone("observation")).toBe("warning");
    expect(taskStatusTone("done")).toBe("success");
  });
});
