import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url({ message: "debe ser una URL, p. ej. http://localhost:4000" }),
});

// Cada variable se referencia de forma literal para que Next pueda inlinearla en el bundle.
const result = publicEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!result.success) {
  const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`[web] Variables de entorno inválidas (${issues}). Revisa .env en la raíz.`);
}

export const publicEnv = result.data;
