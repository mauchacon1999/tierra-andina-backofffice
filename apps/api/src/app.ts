import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";

import type { AppEnv } from "@/lib/types";
import { errorHandler, notFoundHandler } from "@/middleware/errors";
import { requestLogger } from "@/middleware/logger";
import { healthRoutes } from "@/routes/health";
import { v1Routes } from "@/routes/v1";

import pkg from "../package.json" with { type: "json" };

export type AppDeps = {
  /** The only origin allowed by CORS (with credentials). */
  webOrigin: string;
  /** Checks the database; throws if it does not answer. */
  pingDb: () => Promise<void>;
  /** Disables per-request logging (tests). */
  logRequests?: boolean;
};

/** Builds the app without side effects: it reads no env and opens no connections. */
export function createApp({ webOrigin, pingDb, logRequests = true }: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use(requestId());
  if (logRequests) app.use(requestLogger());
  app.use(
    cors({
      origin: webOrigin,
      credentials: true,
      exposeHeaders: ["X-Request-Id"],
    }),
  );

  app.route("/health", healthRoutes({ version: pkg.version, pingDb }));
  app.route("/api/v1", v1Routes());

  app.notFound(notFoundHandler);
  app.onError(errorHandler);

  return app;
}
