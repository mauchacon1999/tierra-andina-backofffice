import { pgEnum } from "drizzle-orm/pg-core";

/*
 * Every enum of docs/domain-model.md. Adding a value later needs a migration
 * (ALTER TYPE … ADD VALUE); values that the owner must be able to extend are tables instead
 * (payment methods, categories).
 */

// Organization
export const membershipRole = pgEnum("membership_role", ["owner", "manager", "receiver"]);
export const auditAction = pgEnum("audit_action", ["insert", "update", "delete"]);

// Catalog
export const purchaseUnit = pgEnum("purchase_unit", ["crate", "bundle", "kg"]);
export const saleUnit = pgEnum("sale_unit", ["kg", "unit"]);
export const supplierKind = pgEnum("supplier_kind", ["wholesale_stall", "local"]);

// Rates
// bcv: official (global) · market: Coche wholesale market rate of the day · sale: owner sale rate
export const exchangeRateKind = pgEnum("exchange_rate_kind", ["bcv", "sale", "market"]);

// Purchasing
export const purchaseTripStatus = pgEnum("purchase_trip_status", ["open", "closed"]);
// market: the Coche trip · local: goods a supplier delivers to the shop (bananas, panela)
export const purchaseTripKind = pgEnum("purchase_trip_kind", ["market", "local"]);
export const paymentStatus = pgEnum("payment_status", ["paid", "credit"]);
export const receiptStatus = pgEnum("receipt_status", [
  "pending",
  "received",
  "partial",
  "missing",
]);
export const supplierClaimStatus = pgEnum("supplier_claim_status", [
  "open",
  "resolved",
  "written_off",
]);
export const shoppingListItemStatus = pgEnum("shopping_list_item_status", [
  "open",
  "bought",
  "dropped",
]);
export const taskStatus = pgEnum("task_status", ["pending", "in_progress", "observation", "done"]);

// Pricing
export const priceListStatus = pgEnum("price_list_status", ["draft", "published"]);

// Daily close
export const currency = pgEnum("currency", ["USD", "VES"]);
export const cashDestination = pgEnum("cash_destination", ["kept", "deposited"]);
export const dailyCloseStatus = pgEnum("daily_close_status", ["submitted", "approved"]);

// Finance
export const creditEntryKind = pgEnum("credit_entry_kind", ["credit", "payment"]);
// Payable status is derived (@ta/core payableStatus), never stored.
export const payableUnit = pgEnum("payable_unit", ["kg", "unit", "sack", "pack"]);
export const payablePaymentMethod = pgEnum("payable_payment_method", [
  "mobile_payment",
  "bank_transfer",
  "cash_bs",
  "cash_usd",
]);
export const expenseKind = pgEnum("expense_kind", ["fixed", "variable"]);
export const recurrenceFrequency = pgEnum("recurrence_frequency", ["weekly", "monthly"]);
