import {
  receiptTripListSchema,
  receiptTripSchema,
  type ReceiptTrip,
  type SetReceipt,
} from "@ta/validators";

import { api } from "@/lib/api";

export async function listReceipts(): Promise<ReceiptTrip[]> {
  const { data } = await api.get("/api/v1/receipts", { schema: receiptTripListSchema });
  return data;
}

export function setReceipt(
  tripId: string,
  lineId: string,
  receipt: SetReceipt,
): Promise<ReceiptTrip> {
  return api.patch(`/api/v1/purchase-trips/${tripId}/lines/${lineId}/receipt`, receipt, {
    schema: receiptTripSchema,
  });
}
