/** One-line summary of an error. Follows `cause` because Drizzle wraps the driver error. */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const root = error.cause instanceof Error ? error.cause : error;
  const code = (root as Error & { code?: string }).code;
  return [code, root.message].filter(Boolean).join(" — ") || error.message;
}
