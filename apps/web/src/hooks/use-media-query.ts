"use client";

import { useSyncExternalStore } from "react";

/** Tailwind's `md` breakpoint: tables from here up, cards below. */
export const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * Whether a CSS media query matches, kept in sync with the window. On the server (and before
 * hydration) it is false, so screens render their mobile layout first (mobile-first).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
