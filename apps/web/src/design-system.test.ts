import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/*
 * Guard for docs/design-system.md: components use semantic tokens (bg-primary, text-muted…),
 * never raw Tailwind palette classes (bg-emerald-700, text-zinc-600…). Colors are only defined
 * in app/globals.css, so light/dark mode and brand changes happen in one place.
 */

const SRC = path.resolve(import.meta.dirname);
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const RAW_COLOR = new RegExp(
  `\\b(?:[a-z-]+:)*(?:bg|text|border|ring|ring-offset|outline|fill|stroke|from|to|via|divide|placeholder|decoration|shadow|accent|caret)-(?:${PALETTE})-\\d{2,3}\\b`,
  "g",
);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(tsx|ts)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("design system", () => {
  it("components use semantic color tokens, not raw palette classes", () => {
    const offenders = sourceFiles(SRC).flatMap((file) =>
      (readFileSync(file, "utf8").match(RAW_COLOR) ?? []).map(
        (cls) => `${path.relative(SRC, file)}: ${cls}`,
      ),
    );

    expect(offenders).toEqual([]);
  });

  it("detects a raw palette class (the guard itself works)", () => {
    expect('className="bg-emerald-700 dark:text-zinc-400"'.match(RAW_COLOR)).toEqual([
      "bg-emerald-700",
      "dark:text-zinc-400",
    ]);
  });
});
