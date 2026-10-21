import {
  manualPriceListSchema,
  manualPriceRowSchema,
  productWhatsappSchema,
  type ManualPriceList,
  type ManualPriceRow,
  type ProductWhatsapp,
  type SetManualPriceInput,
} from "@ta/validators";

import { api } from "@/lib/api";

/** Every active product with its cost, last purchase kilos and price in force. */
export function getManualPrices(): Promise<ManualPriceList> {
  return api.get("/api/v1/price-lists/manual", { schema: manualPriceListSchema });
}

/** Publishes the product's shelf price in bolívares as typed. */
export function saveManualPrice(
  productId: string,
  input: SetManualPriceInput,
): Promise<ManualPriceRow> {
  return api.put(`/api/v1/price-lists/manual/${productId}`, input, {
    schema: manualPriceRowSchema,
  });
}

/** Whether the product goes in the list copied for WhatsApp. */
export function saveShareOnWhatsapp(
  productId: string,
  shareOnWhatsapp: boolean,
): Promise<ProductWhatsapp> {
  return api.patch(
    `/api/v1/products/${productId}/whatsapp`,
    { shareOnWhatsapp },
    { schema: productWhatsappSchema },
  );
}
