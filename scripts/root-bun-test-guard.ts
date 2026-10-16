// Preloaded by the root bunfig.toml, so it only runs for `bun test` launched from the repo root.
// That would also pick up apps/web tests, which need Vitest + jsdom, and fail for the wrong reason.
console.error(
  [
    "✗ Do not run `bun test` from the repo root.",
    "  Use `bun run test`: Turborepo runs each package with its own runner",
    "  (bun test for core/validators/api, Vitest for web).",
    "  Single package: `bun --cwd=packages/core test`.",
  ].join("\n"),
);
process.exit(1);
