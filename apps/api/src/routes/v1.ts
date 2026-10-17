import { Hono } from "hono";

import type { AppEnv } from "@/lib/types";
import { sessionMiddleware } from "@/middleware/auth";
import { customersRoutes } from "@/modules/customers/customers.routes";
import { dailyClosesRoutes } from "@/modules/daily-closes/daily-closes.routes";
import { exchangeRatesRoutes } from "@/modules/exchange-rates/exchange-rates.routes";
import { homeRoutes } from "@/modules/home/home.routes";
import { meRoutes } from "@/modules/me/me.routes";
import { paymentMethodsRoutes } from "@/modules/payment-methods/payment-methods.routes";
import { priceListsRoutes } from "@/modules/price-lists/price-lists.routes";
import { productCategoriesRoutes, productsRoutes } from "@/modules/products/products.routes";
import { purchaseTripsRoutes } from "@/modules/purchases/purchases.routes";
import { receiptsRoutes } from "@/modules/receipts/receipts.routes";
import { settingsRoutes } from "@/modules/settings/settings.routes";
import { shoppingListRoutes } from "@/modules/shopping-list/shopping-list.routes";
import { suppliersRoutes } from "@/modules/suppliers/suppliers.routes";
import { usersRoutes } from "@/modules/users/users.routes";

/** /api/v1 router: every request gets `user`/`session`; modules decide what they require. */
export function v1Routes(): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .use(sessionMiddleware)
    .route("/me", meRoutes())
    .route("/products", productsRoutes())
    .route("/product-categories", productCategoriesRoutes())
    .route("/settings", settingsRoutes())
    .route("/exchange-rates", exchangeRatesRoutes())
    .route("/home", homeRoutes())
    .route("/suppliers", suppliersRoutes())
    .route("/purchase-trips", purchaseTripsRoutes())
    .route("/receipts", receiptsRoutes())
    .route("/shopping-list", shoppingListRoutes())
    .route("/price-lists", priceListsRoutes())
    .route("/payment-methods", paymentMethodsRoutes())
    .route("/customers", customersRoutes())
    .route("/daily-closes", dailyClosesRoutes())
    .route("/users", usersRoutes());
}
