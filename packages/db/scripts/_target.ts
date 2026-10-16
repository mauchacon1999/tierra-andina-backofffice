// Picks the database for a script: DATABASE_URL, or DATABASE_URL_TEST with `--test`.
import { z } from "zod";

export function targetDatabaseUrl(): { name: string; url: string } {
  const useTest = process.argv.includes("--test");
  const key = useTest ? "DATABASE_URL_TEST" : "DATABASE_URL";
  const parsed = z.url({ protocol: /^postgres(ql)?$/ }).safeParse(process.env[key]);
  if (!parsed.success) {
    console.error(`✗ ${key} is missing or invalid. Check .env at the repo root.`);
    process.exit(1);
  }
  return { name: new URL(parsed.data).pathname.slice(1), url: parsed.data };
}
