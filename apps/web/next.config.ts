import { existsSync } from "node:fs";
import path from "node:path";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Monorepo: a single .env at the repo root (see .env.example). @next/env is not used because
// Next already called it for apps/web and returns its cache. Without .env (CI) the real env is used.
const rootEnv = path.resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const nextConfig: NextConfig = {
  // Pinned here so it is inlined at build time in both the server and the client bundles.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "",
  },
  // Production: the API runs on another site (Railway) and browsers drop its session cookie on
  // cross-site requests (Brave and Safari always). Proxying /api/* through the web makes it
  // first-party; NEXT_PUBLIC_API_URL is then the web's own URL. Unset locally: direct calls.
  async rewrites() {
    const target = process.env.API_PROXY_URL;
    if (!target) return [];
    return [{ source: "/api/:path*", destination: `${target.replace(/\/$/, "")}/api/:path*` }];
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

// next-intl: messages and locale come from src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
