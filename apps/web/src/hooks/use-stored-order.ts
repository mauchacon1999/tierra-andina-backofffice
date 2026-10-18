"use client";

import { useState } from "react";

import {
  mergeStoredOrder,
  moveStoredOrder,
  readStoredOrder,
  writeStoredOrder,
} from "@/utils/stored-order";

export type UseStoredOrderResult = {
  ids: string[];
  move: (from: number, to: number) => void;
};

/**
 * A list order chosen on this phone. New ids land at the end, and a refresh does not shuffle it.
 */
export function useStoredOrder(
  storageKey: string,
  current: readonly string[],
): UseStoredOrderResult {
  const [forKey, setForKey] = useState(storageKey);
  const [saved, setSaved] = useState<string[]>(() => readStoredOrder(storageKey));
  if (forKey !== storageKey) {
    setForKey(storageKey);
    setSaved(readStoredOrder(storageKey));
  }
  const ids = mergeStoredOrder(
    forKey === storageKey ? saved : readStoredOrder(storageKey),
    current,
  );

  return {
    ids,
    move: (from, to) => {
      const next = moveStoredOrder(ids, from, to);
      setSaved(next);
      writeStoredOrder(storageKey, next);
    },
  };
}
