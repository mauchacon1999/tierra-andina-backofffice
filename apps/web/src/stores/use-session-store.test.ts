import { afterEach, describe, expect, it } from "vitest";

import { useSessionStore } from "@/stores/use-session-store";

describe("useSessionStore", () => {
  afterEach(() => useSessionStore.getState().clear());

  it("starts without an active store", () => {
    expect(useSessionStore.getState().activeStoreId).toBeNull();
  });

  it("remembers the active store and persists it", () => {
    useSessionStore.getState().setActiveStore("store-1");

    expect(useSessionStore.getState().activeStoreId).toBe("store-1");
    expect(localStorage.getItem("tierra-andina-session")).toContain("store-1");
  });

  it("forgets it on clear (sign-out)", () => {
    useSessionStore.getState().setActiveStore("store-1");
    useSessionStore.getState().clear();

    expect(useSessionStore.getState().activeStoreId).toBeNull();
  });
});
