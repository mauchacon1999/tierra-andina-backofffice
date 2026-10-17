import type { PurchaseUnit } from "@ta/core";
import type { PurchaseLine } from "@ta/validators";

/** Label of the packs field, as the shop counts them at Coche. */
export const PACKS_LABELS = {
  crate: "Cestas",
  bundle: "Cuentas",
  kg: "Kilos",
} as const satisfies Record<PurchaseUnit, string>;

export const PAYMENT_STATUS_LABELS = {
  paid: "Pagado",
  credit: "A crédito",
} as const satisfies Record<PurchaseLine["paymentStatus"], string>;

export const RECEIPT_STATUS_LABELS = {
  pending: "Por recibir",
  received: "Recibido",
  partial: "Incompleto",
  missing: "No llegó",
} as const satisfies Record<PurchaseLine["receiptStatus"], string>;
