import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";

import pkg from "../package.json" with { type: "json" };
import type { AppEnv } from "./lib/types";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { requestLogger } from "./middleware/logger";
import { healthRoutes } from "./routes/health";
import { v1Routes } from "./routes/v1";

export interface AppDeps {
  /** Único origen autorizado por CORS (con credenciales). */
  webOrigin: string;
  /** Comprueba la base de datos; lanza si no responde. */
  pingDb: () => Promise<void>;
  /** Desactiva el log por petición (tests). */
  logRequests?: boolean;
}

/** Construye la app sin efectos secundarios: no lee env ni abre conexiones. */
export function createApp({ webOrigin, pingDb, logRequests = true }: AppDeps) {
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

export type App = ReturnType<typeof createApp>;
