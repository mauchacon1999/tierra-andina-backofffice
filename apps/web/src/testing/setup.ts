// Vitest setup (vitest.config.mts). Testing Library only auto-cleans the DOM between tests when
// Vitest globals are enabled; we import test APIs explicitly, so clean up here.
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
