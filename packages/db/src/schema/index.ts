// The schema is defined in a separate task (see docs/domain-model.md).
//
// Rules (see CLAUDE.md):
// - Tables and columns in English, snake_case, plural table names.
// - Money, rates, kilos and margins: numeric(14, 4); never float/real/double.
// - Every schema change ships with `bun run db:generate`.
export {};
