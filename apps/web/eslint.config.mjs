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
      // Project rule: Next.js never touches the database; everything goes through the API.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@ta/db",
              message: "The web never touches the database: use the API (src/lib/api.ts).",
            },
            { name: "drizzle-orm", message: "The web never touches the database: use the API." },
            { name: "postgres", message: "The web never touches the database: use the API." },
          ],
        },
      ],
    },
  },
  prettier,
]);
