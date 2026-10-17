"use client";

import { useState } from "react";

import type { RowAction } from "@/components/shared/data-table/types";

export type UseRowActionRunnerResult = {
  /** Action waiting for the user's confirmation, if any. */
  pending: RowAction | null;
  /** The confirmed action is running (the dialog shows it busy). */
  isRunning: boolean;
  /** Runs it now, or asks first when it has `confirm`. */
  select: (action: RowAction) => void;
  confirm: () => Promise<void>;
  cancel: () => void;
};

/** Runs row actions; the ones with `confirm` wait in `pending` until the dialog says yes. */
export function useRowActionRunner(): UseRowActionRunnerResult {
  const [pending, setPending] = useState<RowAction | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  return {
    pending,
    isRunning,
    select: (action) => {
      // Plain actions run on their own (they show their own progress, e.g. a navigation).
      if (action.confirm) setPending(action);
      else void action.onSelect?.();
    },
    confirm: async () => {
      if (!pending) return;
      setIsRunning(true);
      try {
        await pending.onSelect?.();
        setPending(null);
      } finally {
        setIsRunning(false);
      }
    },
    cancel: () => setPending(null),
  };
}
