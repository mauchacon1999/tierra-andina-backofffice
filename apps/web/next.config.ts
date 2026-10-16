import { existsSync } from "node:fs";
import path from "node:path";

import type { NextConfig } from "next";

// Monorepo: un único .env en la raíz del repo (ver .env.example). No se usa @next/env porque
// Next ya lo invocó con apps/web y devuelve su caché. Si no hay .env (CI), se usa el entorno.
const rootEnv = path.resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const nextConfig: NextConfig = {
  // Se fija aquí para que quede inlineado en compilación en los bundles de servidor y cliente.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "",
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
