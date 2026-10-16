import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      // Regla del proyecto: Next.js nunca accede a la base; todo pasa por la API.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@ta/db", message: "La web no accede a la base: usa la API (src/lib/api.ts)." },
            { name: "drizzle-orm", message: "La web no accede a la base: usa la API." },
            { name: "postgres", message: "La web no accede a la base: usa la API." },
          ],
        },
      ],
    },
  },
  prettier,
]);
