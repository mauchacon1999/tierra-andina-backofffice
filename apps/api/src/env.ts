import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.url({ message: "must be a URL, e.g. http://localhost:3000" }),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    message: "must be a postgres://user:password@host:port/database URL",
  }),
});

export type Env = z.infer<typeof envSchema>;

/** Validates environment variables. On any problem it exits the process with a clear message. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const lines = result.error.issues.map((issue) => {
    const key = issue.path.join(".") || "(root)";
    const missing = source[key] === undefined || source[key] === "";
    return `  - ${key}: ${missing ? "missing" : issue.message}`;
  });
  console.error(
    [
      "✗ Invalid API configuration. Environment variables with problems:",
      ...lines,
      "",
      "Check the .env file at the repo root (template: .env.example).",
    ].join("\n"),
  );
  process.exit(1);
}

export const env: Env = loadEnv();
