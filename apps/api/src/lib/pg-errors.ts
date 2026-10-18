/** Whether a query failed on the named UNIQUE constraint or unique index (SQLSTATE 23505). */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const cause = error instanceof Error ? (error.cause ?? error) : error;
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === "23505" &&
    "constraint_name" in cause &&
    cause.constraint_name === constraint
  );
}
