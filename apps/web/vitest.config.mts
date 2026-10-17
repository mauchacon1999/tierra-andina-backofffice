import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/testing/setup.ts"],
    // jsdom screens (the close form, the shell) can pass 5s when the suite runs beside the API.
    testTimeout: 15000,
    // lib/env.ts validates this at import time; tests never hit a real API.
    env: { NEXT_PUBLIC_API_URL: "http://api.test" },
    restoreMocks: true,
    unstubGlobals: true,
  },
});
