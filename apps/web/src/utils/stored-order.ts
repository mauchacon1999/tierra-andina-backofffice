/** Saved ids that are still in the list, then any new one at the end. */
export function mergeStoredOrder(saved: readonly string[], current: readonly string[]): string[] {
  const present = new Set(current);
  const kept = saved.filter((id) => present.has(id));
  const keptSet = new Set(kept);
  return [...kept, ...current.filter((id) => !keptSet.has(id))];
}

/** Moves the item at `from` to `to`. Out of range or a no-op returns a copy. */
export function moveStoredOrder(ids: readonly string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return [...ids];
  const next = [...ids];
  const [item] = next.splice(from, 1);
  if (item === undefined) return [...ids];
  next.splice(to, 0, item);
  return next;
}

/** Order saved on this phone, or nothing if it was never sorted. */
export function readStoredOrder(storageKey: string): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string")) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function writeStoredOrder(storageKey: string, ids: readonly string[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(ids));
}
