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
export const exchangeRateKind = pgEnum("exchange_rate_kind", ["bcv", "sale"]);

// Purchasing
export const purchaseTripStatus = pgEnum("purchase_trip_status", ["open", "closed"]);
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

// Pricing
export const priceListStatus = pgEnum("price_list_status", ["draft", "published"]);

// Daily close
export const currency = pgEnum("currency", ["USD", "VES"]);
export const cashDestination = pgEnum("cash_destination", ["kept", "deposited"]);
export const dailyCloseStatus = pgEnum("daily_close_status", ["submitted", "approved"]);

// Finance
export const creditEntryKind = pgEnum("credit_entry_kind", ["credit", "payment"]);
export const payableStatus = pgEnum("payable_status", ["open", "paid"]);
export const expenseKind = pgEnum("expense_kind", ["fixed", "variable"]);
export const recurrenceFrequency = pgEnum("recurrence_frequency", ["weekly", "monthly"]);
