// Vitest setup (vitest.config.mts). Testing Library only auto-cleans the DOM between tests when
// Vitest globals are enabled; we import test APIs explicitly, so clean up here.
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

import { installMatchMedia } from "@/testing/media";

// jsdom has <dialog> but not its modal API; enough for components that open and close it.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}

// Phone layout unless a test calls setDesktop(true) (vitest unstubs globals after each test).
beforeEach(() => {
  installMatchMedia(false);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
