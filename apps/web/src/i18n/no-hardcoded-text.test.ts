import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/*
 * Guard for i18n: what users read comes from src/i18n/messages, never from the code. It flags
 * JSX text (`<p>Hola</p>` or a text-only line between tags), text props (`label="Nombre"`) and
 * sentence-like string literals. Unit symbols ($, Bs, %, kg) and punctuation are allowed.
 */

const SRC = path.resolve(import.meta.dirname, "..");
const SKIP = /([\\/]testing[\\/]|\.test\.tsx?$|\.d\.ts$)/;

const LETTER = "A-Za-zÁÉÍÓÚÑáéíóúñ¿¡";
const CODE_LINE =
  /^\s*(type|readonly|import|export|return|const|let|function|async|await|if|else|case|default)\b|\b(instanceof|typeof|satisfies|as)\b|(&&|\|\||\?|,)\s*$/;

type Check = { name: string; pattern: RegExp; jsxOnly?: boolean };

const CHECKS: Check[] = [
  // >Texto</p> on one line (not "=>", not generics: the text must be followed by a closing tag).
  {
    name: "jsx text",
    pattern: new RegExp(String.raw`(?<![=-])>\s*[^<>{}()=;]*[${LETTER}]{2,}[^<>{}]*</`),
    jsxOnly: true,
  },
  // A line with only words between tags (multi-line JSX children).
  {
    name: "jsx text line",
    pattern: new RegExp(
      String.raw`^\s*[${LETTER}][^<>{}()=;:"'${"`"},&|?]*\s[^<>{}()=;:"'${"`"}&|?]*$`,
    ),
    jsxOnly: true,
  },
  {
    name: "text prop",
    pattern: new RegExp(
      String.raw`\b(?:label|placeholder|hint|title|aria-label|loadingText|question|confirmLabel|alt)="[^"]*[${LETTER}]{2,}[^"]*"`,
    ),
  },
  // "Una frase en español" or "Texto…" in code (messages, fallbacks).
  { name: "sentence literal", pattern: /["'`][A-ZÁÉÍÓÚ¿¡][a-záéíóúñ]+(?: [^"'`]+|…)["'`]/ },
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !SKIP.test(full) ? [full] : [];
  });
}

/** Lines that are code comments (JSDoc, //, /* … *\/ and JSX {/* … *\/}). */
const isComment = (line: string): boolean => /^\s*(\/\/|\/\*|\*|\{\/\*)/.test(line);

/** Hard-coded UI text in a source file; JSX checks apply only to .tsx files. */
function findHardcodedText(source: string, isJsx = true): string[] {
  return source.split("\n").flatMap((line, index) => {
    if (isComment(line)) return [];
    const hit = CHECKS.find(
      (check) => (!check.jsxOnly || (isJsx && !CODE_LINE.test(line))) && check.pattern.test(line),
    );
    return hit ? [`${index + 1} (${hit.name}): ${line.trim()}`] : [];
  });
}

describe("i18n", () => {
  it("UI text comes from the messages, not from the code", () => {
    const offenders = sourceFiles(SRC).flatMap((file) =>
      findHardcodedText(readFileSync(file, "utf8"), file.endsWith(".tsx")).map(
        (hit) => `${path.relative(SRC, file)}:${hit}`,
      ),
    );

    expect(offenders).toEqual([]);
  });

  it.each([
    ["jsx text", '<p className="text-muted">Aún no hay compras.</p>'],
    ["jsx text line", "        Cargando productos"],
    ["text prop", '<TextField label="Nombre" />'],
    ["sentence literal", 'const FALLBACK = "No se pudo guardar";'],
  ])("detects %s (the guard itself works)", (_kind, line) => {
    expect(findHardcodedText(line)).toHaveLength(1);
  });

  it.each([
    ['<TextField label={t("name")} suffix="Bs" />'],
    ['<span className="font-mono">{code}</span>'],
    ["  canEdit,"],
    ["/** Explains why, in English. */"],
    ["  onSubmit: () => Promise<void>;"],
    ["  type PurchaseLineFields,"],
    ["        f.rates?.bcv &&"],
    ['  suffix="%"'],
  ])("allows %s", (line) => {
    expect(findHardcodedText(line)).toEqual([]);
  });
});
