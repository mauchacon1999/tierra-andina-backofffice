import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url({ message: "must be a URL, e.g. http://localhost:4000" }),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

// Each variable is referenced literally so Next can inline it into the bundle.
const result = publicEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!result.success) {
  const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`[web] Invalid environment variables (${issues}). Check .env at the repo root.`);
}

export const publicEnv: PublicEnv = result.data;
