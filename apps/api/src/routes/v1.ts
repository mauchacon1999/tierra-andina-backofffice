import { Hono } from "hono";

import type { AppEnv } from "@/lib/types";
import { sessionMiddleware } from "@/middleware/auth";
import { exchangeRatesRoutes } from "@/modules/exchange-rates/exchange-rates.routes";
import { meRoutes } from "@/modules/me/me.routes";
import { productCategoriesRoutes, productsRoutes } from "@/modules/products/products.routes";
import { settingsRoutes } from "@/modules/settings/settings.routes";

/** /api/v1 router: every request gets `user`/`session`; modules decide what they require. */
export function v1Routes(): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .use(sessionMiddleware)
    .route("/me", meRoutes())
    .route("/products", productsRoutes())
    .route("/product-categories", productCategoriesRoutes())
    .route("/settings", settingsRoutes())
    .route("/exchange-rates", exchangeRatesRoutes());
}
