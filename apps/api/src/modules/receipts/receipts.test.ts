import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { schema } from "@ta/db";
import { testConnection, uniq } from "@ta/db/testing";
import {
  receiptTripListSchema,
  receiptTripSchema,
  tripDetailSchema,
  tripSchema,
  type ReceiptTrip,
} from "@ta/validators";
import { and, desc, eq } from "drizzle-orm";

import {
  call,
  closeOpenTrips,
  errorOf,
  signInOwnStore,
  type Json,
  type RoleSession,
} from "@/testing/http";

let s: RoleSession;
let categoryId: string;
let dayCounter = 0;

// 3 tomato crates (72 kg, shrinkage 6) for 60 USD; Coche 201, BCV 200, margin 50 %.
const THREE_CRATES = {
  packs: "3",
  grossQuantity: "72",
  shrinkage: "6",
  quotedPriceUsd: "60",
  margin: "0.5",
};

/** An open trip on its own December day with one line; returns the ids. */
async function tripWithLine(
  line: Json = THREE_CRATES,
): Promise<{ tripId: string; lineId: string }> {
  dayCounter += 1;
  const date = `2026-12-${String(dayCounter).padStart(2, "0")}`;
  await call(s.app, "PUT", `/exchange-rates/${date}`, s.owner, {
    bcv: "200",
    market: "201",
    sale: "210",
  });
  await closeOpenTrips(s.storeId);
  const trip = await call(s.app, "POST", "/purchase-trips", s.owner, { businessDate: date });
  const tripId = tripSchema.parse(trip.body).id;
  const product = await call(s.app, "POST", "/products", s.owner, {
    name: uniq("Tomate"),
    categoryId,
    purchaseUnit: "crate",
    saleUnit: "kg",
    defaultPackQuantity: "24",
  });
  const added = await call(s.app, "POST", `/purchase-trips/${tripId}/lines`, s.owner, {
    productId: (product.body as { id: string }).id,
    ...line,
  });
  const lineId = tripDetailSchema.parse(added.body).lines[0]?.id;
  if (!lineId) throw new Error(`line: ${JSON.stringify(added.body)}`);
  return { tripId, lineId };
}

const receipt = (tripId: string, lineId: string, cookie: string, body: Json) =>
  call(s.app, "PATCH", `/purchase-trips/${tripId}/lines/${lineId}/receipt`, cookie, body);

const ownerLine = async (tripId: string) => {
  const res = await call(s.app, "GET", `/purchase-trips/${tripId}`, s.owner);
  const trip = tripDetailSchema.parse(res.body);
  return { trip, line: trip.lines[0]! };
};

const receiptTrip = (body: Json): ReceiptTrip => receiptTripSchema.parse(body);

beforeAll(async () => {
  s = await signInOwnStore();
  const [category] = await testConnection()
    .db.select()
    .from(schema.productCategories)
    .where(eq(schema.productCategories.code, "vegetable"));
  if (!category) throw new Error("category");
  categoryId = category.id;
});

afterAll(async () => {
  await call(s.app, "PATCH", "/settings", s.owner, { receiverCanSeePrices: false });
});

describe("PATCH /api/v1/purchase-trips/:id/lines/:lineId/receipt", () => {
  test("the receiver marks a line received: all packs, who and when; totals unchanged", async () => {
    const { tripId, lineId } = await tripWithLine();

    const res = await receipt(tripId, lineId, s.receiver, { status: "received" });

    expect(res.status).toBe(200);
    expect(receiptTrip(res.body).lines[0]).toMatchObject({
      receiptStatus: "received",
      receivedPacks: "3.0000",
      receivedQuantity: "72.0000",
      quotedPriceUsd: null,
    });
    const { trip, line } = await ownerLine(tripId);
    expect(line.receivedAt).not.toBeNull();
    expect(trip.totalUsd).toBe("60.3000");
    expect(line.receivedUnitCostUsd).toBeNull();
  });

  test("partial: 2 of 3 crates → the same 60.30 $ over 44 kg (1.3705 $/kg, sells at 2.10)", async () => {
    const { tripId, lineId } = await tripWithLine();

    const res = await receipt(tripId, lineId, s.receiver, {
      status: "partial",
      receivedPacks: "2",
      note: "Faltó una cesta",
    });

    expect(res.status).toBe(200);
    const { trip, line } = await ownerLine(tripId);
    expect(line).toMatchObject({
      receiptStatus: "partial",
      receivedPacks: "2.0000",
      receivedQuantity: "48.0000",
      receiptNote: "Faltó una cesta",
      receivedUsableQuantity: "44.0000",
      receivedUnitCostUsd: "1.3705",
      receivedSalePriceUsd: "2.1000",
      // What was bought stays as bought.
      unitCostUsd: "0.9136",
      salePriceUsd: "1.4000",
    });
    expect(trip.totalUsd).toBe("60.3000");
  });

  test("partial with the weighed quantity (50 kg)", async () => {
    const { tripId, lineId } = await tripWithLine();

    await receipt(tripId, lineId, s.owner, {
      status: "partial",
      receivedPacks: "2",
      receivedQuantity: "50",
    });

    expect((await ownerLine(tripId)).line).toMatchObject({
      receivedQuantity: "50.0000",
      receivedUsableQuantity: "45.8333",
      receivedUnitCostUsd: "1.3156",
    });
  });

  test("422 INVALID_RECEIPT on the field when the packs are not a partial receipt", async () => {
    const { tripId, lineId } = await tripWithLine();

    const res = await receipt(tripId, lineId, s.receiver, {
      status: "partial",
      receivedPacks: "3",
    });

    expect(res.status).toBe(422);
    expect(errorOf(res.body)).toMatchObject({
      code: "INVALID_RECEIPT",
      details: { fieldErrors: { receivedPacks: ["Debe ser más de 0 y menos de lo comprado"] } },
    });
  });

  test("missing, then corrected back to pending (clears everything)", async () => {
    const { tripId, lineId } = await tripWithLine();

    await receipt(tripId, lineId, s.receiver, { status: "missing" });
    expect((await ownerLine(tripId)).line).toMatchObject({
      receiptStatus: "missing",
      receivedPacks: "0.0000",
    });

    await receipt(tripId, lineId, s.receiver, { status: "pending" });
    expect((await ownerLine(tripId)).line).toMatchObject({
      receiptStatus: "pending",
      receivedPacks: null,
      receivedQuantity: null,
      receivedAt: null,
      receiptNote: null,
    });
  });

  test("every mark is audited", async () => {
    const { tripId, lineId } = await tripWithLine();
    await receipt(tripId, lineId, s.receiver, { status: "received" });

    const [entry] = await testConnection()
      .db.select()
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.recordId, lineId), eq(schema.auditLogs.action, "update")))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(1);
    expect(JSON.stringify(entry?.changes)).toContain("received");
  });

  test("400 for an unknown status, 403 for a manager, 404 for another line, 409 when closed", async () => {
    const { tripId, lineId } = await tripWithLine();

    expect((await receipt(tripId, lineId, s.receiver, { status: "lost" })).status).toBe(400);
    expect((await receipt(tripId, lineId, s.manager, { status: "received" })).status).toBe(403);
    expect(
      (await receipt(tripId, crypto.randomUUID(), s.receiver, { status: "received" })).status,
    ).toBe(404);

    await call(s.app, "POST", `/purchase-trips/${tripId}/close`, s.owner);
    const closed = await receipt(tripId, lineId, s.receiver, { status: "received" });
    expect(closed.status).toBe(409);
    expect(errorOf(closed.body).code).toBe("TRIP_CLOSED");
  });
});

describe("editing a line that was already received (owner)", () => {
  test("a new price re-costs a partial receipt with the same packs that arrived", async () => {
    const { tripId, lineId } = await tripWithLine();
    await receipt(tripId, lineId, s.receiver, { status: "partial", receivedPacks: "2" });

    await call(s.app, "PATCH", `/purchase-trips/${tripId}/lines/${lineId}`, s.owner, {
      quotedPriceUsd: "66",
    });

    // 66 × 201 / 200 = 66.33 $ over 44 kg → 1.5075 $/kg → 2.2613 → sells at 2.30.
    expect((await ownerLine(tripId)).line).toMatchObject({
      receiptStatus: "partial",
      receivedPacks: "2.0000",
      receivedUnitCostUsd: "1.5075",
      receivedSalePriceUsd: "2.3000",
    });
  });

  test("changing what was bought (packs) sends it back to be checked again", async () => {
    const { tripId, lineId } = await tripWithLine();
    await receipt(tripId, lineId, s.receiver, { status: "received" });

    await call(s.app, "PATCH", `/purchase-trips/${tripId}/lines/${lineId}`, s.owner, {
      packs: "4",
      grossQuantity: "96",
    });

    expect((await ownerLine(tripId)).line).toMatchObject({
      receiptStatus: "pending",
      receivedPacks: null,
    });
  });
});

describe("GET /api/v1/receipts", () => {
  test("receiver: the open trips with what to check, prices hidden", async () => {
    const { tripId } = await tripWithLine();

    const res = await call(s.app, "GET", "/receipts", s.receiver);

    expect(res.status).toBe(200);
    const trip = receiptTripListSchema.parse(res.body).data.find((t) => t.id === tripId);
    expect(trip?.lines[0]).toMatchObject({
      packs: "3.0000",
      receiptStatus: "pending",
      quotedPriceUsd: null,
    });
  });

  test("the owner sees prices; a receiver too when the store allows it", async () => {
    const { tripId } = await tripWithLine();
    const priceFor = async (cookie: string) =>
      receiptTripListSchema
        .parse((await call(s.app, "GET", "/receipts", cookie)).body)
        .data.find((t) => t.id === tripId)?.lines[0]?.quotedPriceUsd;

    expect(await priceFor(s.owner)).toBe("60.0000");
    await call(s.app, "PATCH", "/settings", s.owner, { receiverCanSeePrices: true });
    expect(await priceFor(s.receiver)).toBe("60.0000");
  });

  test("the newest open trip lists what is still to buy, and marking a line keeps it", async () => {
    const { tripId, lineId } = await tripWithLine();
    const product = await call(s.app, "POST", "/products", s.owner, {
      name: uniq("Cebolla"),
      categoryId,
      purchaseUnit: "kg",
      saleUnit: "kg",
    });
    expect(product.status).toBe(201);
    const created = await call(s.app, "POST", "/shopping-list", s.owner, {
      productId: (product.body as { id: string }).id,
      note: "se acabó",
    });
    expect(created.status).toBe(201);

    const listed = receiptTripListSchema
      .parse((await call(s.app, "GET", "/receipts", s.receiver)).body)
      .data.find((t) => t.id === tripId);
    if (!listed) throw new Error("trip missing from receipts");
    expect(listed.toBuy).toEqual([
      expect.objectContaining({
        productName: expect.stringContaining("Cebolla"),
        note: "se acabó",
      }),
    ]);

    const marked = receiptTrip(
      (await receipt(tripId, lineId, s.receiver, { status: "received" })).body,
    );
    expect(marked.toBuy).toEqual(listed.toBuy);
  });

  test("closed trips are not listed; managers cannot see it; 401 without a session", async () => {
    const { tripId } = await tripWithLine();
    await call(s.app, "POST", `/purchase-trips/${tripId}/close`, s.owner);

    const list = receiptTripListSchema.parse((await call(s.app, "GET", "/receipts", s.owner)).body);
    expect(list.data.some((t) => t.id === tripId)).toBe(false);
    expect((await call(s.app, "GET", "/receipts", s.manager)).status).toBe(403);
    expect((await call(s.app, "GET", "/receipts", null)).status).toBe(401);
  });
});
