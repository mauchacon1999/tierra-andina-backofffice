import type { RequestIdVariables } from "hono/request-id";

/** Tipos de contexto compartidos por toda la app Hono. */
export interface AppEnv {
  Variables: RequestIdVariables;
}
