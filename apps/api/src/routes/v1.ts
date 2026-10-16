import { Hono } from "hono";

import type { AppEnv } from "../lib/types";

/** Router /api/v1. Aquí se montarán los módulos de negocio (aún vacío). */
export const v1Routes = () => new Hono<AppEnv>();
