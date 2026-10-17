import type { Executor } from "@ta/db";
import type { PaymentMethod } from "@ta/validators";

import {
  findActivePaymentMethods,
  findActivePaymentMethodsByIds,
  type PaymentMethodRecord,
} from "./payment-methods.repository";

export type { PaymentMethodRecord };

/** Active payment methods in the order the close form shows them. */
export function listPaymentMethods(db: Executor): Promise<PaymentMethodRecord[]> {
  return findActivePaymentMethods(db);
}

/** The active methods among `ids` (unknown or inactive ids are simply missing). */
export function findActiveMethods(
  db: Executor,
  ids: readonly string[],
): Promise<PaymentMethodRecord[]> {
  return findActivePaymentMethodsByIds(db, ids);
}

export function toPaymentMethodDto(row: PaymentMethodRecord): PaymentMethod {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    currency: row.currency,
    sortOrder: row.sortOrder,
  };
}
