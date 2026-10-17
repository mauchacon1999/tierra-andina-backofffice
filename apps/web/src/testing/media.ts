import { vi } from "vitest";

/**
 * jsdom has no matchMedia. Every query answers `matches` (false by default = phone layout);
 * call `setDesktop(true)` in a test to render desktop layouts (tables instead of cards).
 */
export function installMatchMedia(matches = false): void {
  vi.stubGlobal("matchMedia", (query: string): MediaQueryList => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

export const setDesktop = (isDesktop: boolean): void => installMatchMedia(isDesktop);
