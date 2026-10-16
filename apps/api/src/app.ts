import type { Database } from "@ta/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";

import { toUnifiedAuthResponse, type Auth } from "@/lib/auth";
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
  db: Database;
  auth: Auth;
  /** Disables per-request logging (tests). */
  logRequests?: boolean;
};

/** Builds the app without side effects: it reads no env; connections are passed in. */
export function createApp({
  webOrigin,
  pingDb,
  db,
  auth,
  logRequests = true,
}: AppDeps): Hono<AppEnv> {
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
  app.use(async (c, next) => {
    c.set("db", db);
    c.set("auth", auth);
    await next();
  });

  app.route("/health", healthRoutes({ version: pkg.version, pingDb }));
  // Better Auth endpoints (sign-in, sign-out, session…), with errors in the unified format.
  app.on(["GET", "POST"], "/api/auth/*", async (c) =>
    toUnifiedAuthResponse(await auth.handler(c.req.raw)),
  );
  app.route("/api/v1", v1Routes());

  app.notFound(notFoundHandler);
  app.onError(errorHandler);

  return app;
}
