// Vercel entrypoint (Bun framework preset: it looks for server.ts and routes every request to
// the Bun.serve() call made at startup). It loads the bundle from `bun run build` instead of
// src/ because Vercel does not resolve the `@/` aliases or the @ta/* workspace sources.
import "./dist/index.js";
