import {
  createProductFieldsSchema,
  productListQuerySchema,
  productWhatsappSchema,
  quickCreateProductFieldsSchema,
  updateProductSchema,
  type MembershipRole,
} from "@ta/validators";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "@/lib/types";
import { validate } from "@/lib/validate";
import { getActor, getMembership, requireRole } from "@/middleware/auth";

import {
  toCategoryDto,
  toProductDetailDto,
  toProductDto,
  toProductSummaryDto,
} from "./products.mapper";
import {
  createProduct,
  getProduct,
  listCategories,
  listProducts,
  quickCreateProduct,
  setProductActive,
  setShareOnWhatsapp,
  updateProduct,
} from "./products.service";

const ANY_ROLE: MembershipRole[] = ["owner", "manager", "receiver"];
const idParamSchema = z.object({ id: z.uuid({ error: "Identificador inválido" }) });

/** /api/v1/products (docs/modules/products.md §5). Writes: owner only. */
export function productsRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .get("/", requireRole(...ANY_ROLE), validate("query", productListQuerySchema), async (c) => {
      const page = await listProducts(c.get("db"), c.req.valid("query"));
      const isReceiver = getMembership(c).role === "receiver";
      return c.json({
        ...page,
        data: page.data.map(isReceiver ? toProductSummaryDto : toProductDto),
      });
    })
    .get("/:id", requireRole(...ANY_ROLE), validate("param", idParamSchema), async (c) => {
      const product = await getProduct(c.get("db"), c.req.valid("param").id);
      return c.json(
        getMembership(c).role === "receiver"
          ? toProductSummaryDto(product)
          : toProductDetailDto(product),
      );
    })
    .post("/", requireRole("owner"), validate("json", createProductFieldsSchema), async (c) => {
      const product = await createProduct(c.get("db"), getActor(c), c.req.valid("json"));
      return c.json(toProductDto(product), 201);
    })
    .post(
      "/quick",
      requireRole("owner"),
      validate("json", quickCreateProductFieldsSchema),
      async (c) => {
        const product = await quickCreateProduct(c.get("db"), getActor(c), c.req.valid("json"));
        return c.json(toProductDto(product), 201);
      },
    )
    .patch(
      "/:id",
      requireRole("owner"),
      validate("param", idParamSchema),
      validate("json", updateProductSchema),
      async (c) => {
        const product = await updateProduct(
          c.get("db"),
          getActor(c),
          c.req.valid("param").id,
          c.req.valid("json"),
        );
        return c.json(toProductDetailDto(product));
      },
    )
    .post("/:id/deactivate", requireRole("owner"), validate("param", idParamSchema), async (c) => {
      const id = c.req.valid("param").id;
      return c.json(toProductDto(await setProductActive(c.get("db"), getActor(c), id, false)));
    })
    .post("/:id/activate", requireRole("owner"), validate("param", idParamSchema), async (c) => {
      const id = c.req.valid("param").id;
      return c.json(toProductDto(await setProductActive(c.get("db"), getActor(c), id, true)));
    })
    .patch(
      "/:id/whatsapp",
      requireRole("owner"),
      validate("param", idParamSchema),
      validate("json", productWhatsappSchema),
      async (c) => {
        const { shareOnWhatsapp } = c.req.valid("json");
        const product = await setShareOnWhatsapp(
          c.get("db"),
          getActor(c),
          c.req.valid("param").id,
          shareOnWhatsapp,
        );
        return c.json({ id: product.id, shareOnWhatsapp: product.shareOnWhatsapp });
      },
    );
}

/** /api/v1/product-categories */
export function productCategoriesRoutes(): Hono<AppEnv> {
  return new Hono<AppEnv>().get("/", requireRole(...ANY_ROLE), async (c) => {
    const categories = await listCategories(c.get("db"));
    return c.json({ data: categories.map(toCategoryDto) });
  });
}
