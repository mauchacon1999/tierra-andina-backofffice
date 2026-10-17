import { beforeEach, describe, expect, it } from "vitest";

import { useUiStore } from "@/stores/use-ui-store";

describe("useUiStore", () => {
  beforeEach(() => {
    useUiStore.setState({ isSidebarCollapsed: false });
  });

  it("toggles the sidebar and persists the preference on this device", () => {
    useUiStore.getState().toggleSidebar();

    expect(useUiStore.getState().isSidebarCollapsed).toBe(true);
    expect(localStorage.getItem("tierra-andina-ui")).toContain('"isSidebarCollapsed":true');
  });
});
