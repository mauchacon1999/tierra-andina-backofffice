import type { RequestIdVariables } from "hono/request-id";

/** Context types shared by the whole Hono app. */
export type AppEnv = {
  Variables: RequestIdVariables;
};
