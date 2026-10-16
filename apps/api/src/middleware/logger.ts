import type { MiddlewareHandler } from "hono";

import type { AppEnv } from "@/lib/types";

/** One log line per request: method, path, status, duration and request id. */
export const requestLogger = (
  log: (line: string) => void = console.log,
): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const start = performance.now();
    await next();
    const ms = (performance.now() - start).toFixed(1);
    log(`${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms [${c.get("requestId")}]`);
  };
};
