"use client";

import { useEffect, useRef, useState } from "react";

/** How long the "Copiado" notice stays next to the button. */
export const COPIED_NOTICE_MS = 2000;

export type CopyState = { key: string; ok: boolean } | null;

export type UseCopyResult = {
  /** Copies `text`; `key` says which button did it (for its notice). */
  copy: (key: string, text: string) => Promise<void>;
  /** The last copy for a short while: which button and whether it worked. */
  last: CopyState;
};

/** Copy to the clipboard with a short "Copiado" (or failure) notice per button. */
export function useCopy(): UseCopyResult {
  const [last, setLast] = useState<CopyState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = (state: CopyState) => {
    clearTimeout(timer.current);
    setLast(state);
    timer.current = setTimeout(() => setLast(null), COPIED_NOTICE_MS);
  };

  return {
    copy: async (key, text) => {
      try {
        await navigator.clipboard.writeText(text);
        show({ key, ok: true });
      } catch {
        show({ key, ok: false });
      }
    },
    last,
  };
}
