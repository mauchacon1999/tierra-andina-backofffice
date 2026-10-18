import {
  openTripSchema,
  purchaseLineFieldsSchema,
  setReceiptSchema,
  tripListQuerySchema,
  updatePurchaseLineSchema,
} from "@ta/validators";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "@/lib/types";
import { validate } from "@/lib/validate";
import { getActor, getMembership, requireRole } from "@/middleware/auth";

import { toReceiptTripDto, toTripDetailDto, toTripDto } from "./purchases.mapper";
import {
  addLine,
  closeTrip,
  deleteLine,
  getTrip,
  listTrips,
  openTrip,
  setLineReceipt,
  toBuyForTrip,
  updateLine,
} from "./purchases.service";
import { canSeePrices } from "@/modules/receipts/receipts.service";

const tripParam = z.object({ id: z.uuid({ error: "Identificador inválido" }) });
const lineParam = tripParam.extend({ lineId: z.uuid({ error: "Identificador inválido" }) });

/**
 * /api/v1/purchase-trips — purchases at the wholesale market. Recording purchases, costs and
 * margins is owner-only (docs/plan.md §4); marking what arrived at the truck is also open to
 * the receiver, who gets the trip without costs (domain-model §4).
 */
export function purchaseTripsRoutes(): Hono<AppEnv> {
  const owner = requireRole("owner");
  return new Hono<AppEnv>()
    .get("/", owner, validate("query", tripListQuerySchema), async (c) => {
      const page = await listTrips(c.get("db"), getMembership(c).storeId, c.req.valid("query"));
      return c.json({ ...page, data: page.data.map(toTripDto) });
    })
    .post("/", owner, validate("json", openTripSchema), async (c) => {
      const trip = await openTrip(c.get("db"), getActor(c), c.req.valid("json"));
      return c.json(toTripDto(trip), 201);
    })
    .get("/:id", owner, validate("param", tripParam), async (c) => {
      const trip = await getTrip(c.get("db"), getMembership(c).storeId, c.req.valid("param").id);
      return c.json(toTripDetailDto(trip));
    })
    .post("/:id/close", owner, validate("param", tripParam), async (c) => {
      const trip = await closeTrip(c.get("db"), getActor(c), c.req.valid("param").id);
      return c.json(toTripDetailDto(trip));
    })
    .post(
      "/:id/lines",
      owner,
      validate("param", tripParam),
      validate("json", purchaseLineFieldsSchema),
      async (c) => {
        const trip = await addLine(
          c.get("db"),
          getActor(c),
          c.req.valid("param").id,
          c.req.valid("json"),
        );
        return c.json(toTripDetailDto(trip), 201);
      },
    )
    .patch(
      "/:id/lines/:lineId/receipt",
      requireRole("owner", "receiver"),
      validate("param", lineParam),
      validate("json", setReceiptSchema),
      async (c) => {
        const db = c.get("db");
        const { id, lineId } = c.req.valid("param");
        const trip = await setLineReceipt(
          db,
          getActor(c),
          id,
          lineId,
          c.req.valid("json"),
          new Date(),
        );
        const membership = getMembership(c);
        const [showPrices, toBuy] = await Promise.all([
          canSeePrices(db, membership),
          toBuyForTrip(db, membership.storeId, trip.id),
        ]);
        return c.json(toReceiptTripDto(trip, showPrices, toBuy));
      },
    )
    .patch(
      "/:id/lines/:lineId",
      owner,
      validate("param", lineParam),
      validate("json", updatePurchaseLineSchema),
      async (c) => {
        const { id, lineId } = c.req.valid("param");
        const trip = await updateLine(c.get("db"), getActor(c), id, lineId, c.req.valid("json"));
        return c.json(toTripDetailDto(trip));
      },
    )
    .delete("/:id/lines/:lineId", owner, validate("param", lineParam), async (c) => {
      const { id, lineId } = c.req.valid("param");
      return c.json(toTripDetailDto(await deleteLine(c.get("db"), getActor(c), id, lineId)));
    });
}
