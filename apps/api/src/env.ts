import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.url({ message: "debe ser una URL, p. ej. http://localhost:3000" }),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    message: "debe ser una URL postgres://usuario:clave@host:puerto/base",
  }),
});

export type Env = z.infer<typeof envSchema>;

/** Valida variables de entorno. Si algo falta o es inválido, termina el proceso con un mensaje claro. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const lines = result.error.issues.map((issue) => {
    const key = issue.path.join(".") || "(raíz)";
    const missing = source[key] === undefined || source[key] === "";
    return `  - ${key}: ${missing ? "falta la variable" : issue.message}`;
  });
  console.error(
    [
      "✗ Configuración inválida de la API. Variables de entorno con problemas:",
      ...lines,
      "",
      "Revisa el archivo .env de la raíz (plantilla: .env.example).",
    ].join("\n"),
  );
  process.exit(1);
}

export const env = loadEnv();
