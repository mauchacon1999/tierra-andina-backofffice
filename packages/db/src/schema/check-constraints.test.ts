import { describe, expect, test } from "bun:test";

import { sql } from "drizzle-orm";

import {
  createBase,
  valid,
  validPayrollPayment,
  validProduct,
  validPurchaseLine,
  type Base,
} from "../testing/fixtures";
import {
  expectOk,
  expectPgError,
  inRollback,
  PG_CHECK_VIOLATION,
  testConnection,
  type Tx,
} from "../testing/test-db";
import {
  customerCreditEntries,
  dailyClosePayments,
  dailyCloses,
  employees,
  exchangeRates,
  expenses,
  payablePayments,
  payables,
  payrollPayments,
  priceListLines,
  priceLists,
  products,
  purchaseLines,
  purchaseTrips,
  recurringExpenses,
  salaryAdvances,
  supplierClaims,
} from ".";

type Write = (tx: Tx, b: Base) => Promise<unknown>;
type CheckCase = { constraint: string; valid: Write; invalid: Record<string, Write> };

const line = (b: Base, o: Parameters<typeof validPurchaseLine>[3]) =>
  validPurchaseLine(b.trip.id, b.product.id, b.supplier.id, o);

/** One entry per CHECK constraint in the schema; the meta-test below enforces that. */
const CASES: CheckCase[] = [
  // products
  {
    constraint: "products_unit_combination_check",
    valid: (tx, b) => tx.insert(products).values(validProduct(b.category.id)),
    invalid: {
      "kg bought, unit sold": (tx, b) =>
        tx.insert(products).values(
          validProduct(b.category.id, {
            purchaseUnit: "kg",
            saleUnit: "unit",
            defaultPackQuantity: null,
            lastShrinkage: "0",
          }),
        ),
    },
  },
  {
    constraint: "products_default_pack_quantity_check",
    valid: (tx, b) =>
      tx.insert(products).values(
        validProduct(b.category.id, {
          purchaseUnit: "kg",
          defaultPackQuantity: null,
          lastShrinkage: "0",
        }),
      ),
    invalid: {
      "crate without pack quantity": (tx, b) =>
        tx
          .insert(products)
          .values(validProduct(b.category.id, { defaultPackQuantity: null, lastShrinkage: "0" })),
      "pack quantity zero": (tx, b) =>
        tx
          .insert(products)
          .values(validProduct(b.category.id, { defaultPackQuantity: "0", lastShrinkage: "0" })),
      "kg with pack quantity": (tx, b) =>
        tx.insert(products).values(validProduct(b.category.id, { purchaseUnit: "kg" })),
    },
  },
  {
    constraint: "products_last_shrinkage_check",
    valid: (tx, b) =>
      tx.insert(products).values(validProduct(b.category.id, { lastShrinkage: "0" })),
    invalid: {
      negative: (tx, b) =>
        tx.insert(products).values(validProduct(b.category.id, { lastShrinkage: "-1" })),
      "equal to pack quantity": (tx, b) =>
        tx.insert(products).values(validProduct(b.category.id, { lastShrinkage: "24" })),
    },
  },
  {
    constraint: "products_last_margin_check",
    valid: (tx, b) => tx.insert(products).values(validProduct(b.category.id, { lastMargin: "5" })),
    invalid: {
      negative: (tx, b) =>
        tx.insert(products).values(validProduct(b.category.id, { lastMargin: "-0.01" })),
      "above 500 %": (tx, b) =>
        tx.insert(products).values(validProduct(b.category.id, { lastMargin: "5.0001" })),
    },
  },
  // exchange_rates
  {
    constraint: "exchange_rates_value_check",
    valid: (tx, b) => tx.insert(exchangeRates).values(valid.exchangeRate(b)),
    invalid: {
      zero: (tx, b) => tx.insert(exchangeRates).values(valid.exchangeRate(b, { value: "0" })),
    },
  },
  {
    constraint: "exchange_rates_store_scope_check",
    valid: (tx, b) =>
      tx.insert(exchangeRates).values(valid.exchangeRate(b, { storeId: null, kind: "bcv" })),
    invalid: {
      "bcv with store": (tx, b) =>
        tx.insert(exchangeRates).values(valid.exchangeRate(b, { kind: "bcv" })),
      "sale without store": (tx, b) =>
        tx.insert(exchangeRates).values(valid.exchangeRate(b, { storeId: null })),
      "market (Coche) without store": (tx, b) =>
        tx.insert(exchangeRates).values(valid.exchangeRate(b, { storeId: null, kind: "market" })),
    },
  },
  // purchase_trips
  {
    constraint: "purchase_trips_bcv_rate_check",
    valid: (tx, b) => tx.insert(purchaseTrips).values(valid.purchaseTrip(b)),
    invalid: {
      zero: (tx, b) => tx.insert(purchaseTrips).values(valid.purchaseTrip(b, { bcvRate: "0" })),
    },
  },
  {
    constraint: "purchase_trips_market_rate_check",
    valid: (tx, b) => tx.insert(purchaseTrips).values(valid.purchaseTrip(b, { marketRate: "201" })),
    invalid: {
      zero: (tx, b) => tx.insert(purchaseTrips).values(valid.purchaseTrip(b, { marketRate: "0" })),
    },
  },
  {
    constraint: "purchase_trips_amounts_check",
    valid: (tx, b) => tx.insert(purchaseTrips).values(valid.purchaseTrip(b, { totalUsd: "0" })),
    invalid: {
      "total_usd < 0": (tx, b) =>
        tx.insert(purchaseTrips).values(valid.purchaseTrip(b, { totalUsd: "-1" })),
      "total_bs < 0": (tx, b) =>
        tx.insert(purchaseTrips).values(valid.purchaseTrip(b, { totalBs: "-1" })),
    },
  },
  // purchase_lines
  {
    constraint: "purchase_lines_packs_check",
    valid: (tx, b) => tx.insert(purchaseLines).values(line(b, { packs: "0.5" })),
    invalid: { zero: (tx, b) => tx.insert(purchaseLines).values(line(b, { packs: "0" })) },
  },
  {
    constraint: "purchase_lines_gross_quantity_check",
    valid: (tx, b) => tx.insert(purchaseLines).values(line(b, {})),
    invalid: {
      zero: (tx, b) =>
        tx
          .insert(purchaseLines)
          .values(line(b, { grossQuantity: "0", shrinkage: "0", usableQuantity: "0" })),
    },
  },
  {
    constraint: "purchase_lines_shrinkage_check",
    valid: (tx, b) =>
      tx.insert(purchaseLines).values(line(b, { shrinkage: "0", usableQuantity: "24" })),
    invalid: {
      negative: (tx, b) =>
        tx.insert(purchaseLines).values(line(b, { shrinkage: "-1", usableQuantity: "25" })),
      "equal to gross (domain-model §3.3)": (tx, b) =>
        tx.insert(purchaseLines).values(line(b, { shrinkage: "24", usableQuantity: "0" })),
      "above gross": (tx, b) =>
        tx.insert(purchaseLines).values(line(b, { shrinkage: "30", usableQuantity: "-6" })),
    },
  },
  {
    constraint: "purchase_lines_usable_quantity_check",
    valid: (tx, b) => tx.insert(purchaseLines).values(line(b, {})),
    invalid: {
      "not gross − shrinkage": (tx, b) =>
        tx.insert(purchaseLines).values(line(b, { usableQuantity: "23" })),
    },
  },
  {
    constraint: "purchase_lines_amounts_check",
    valid: (tx, b) => tx.insert(purchaseLines).values(line(b, { quotedPriceUsd: "0" })),
    invalid: {
      "quoted_price_usd < 0": (tx, b) =>
        tx.insert(purchaseLines).values(line(b, { quotedPriceUsd: "-1" })),
      "amount_bs < 0": (tx, b) => tx.insert(purchaseLines).values(line(b, { amountBs: "-1" })),
      "real_cost_usd < 0": (tx, b) =>
        tx.insert(purchaseLines).values(line(b, { realCostUsd: "-1" })),
      "unit_cost_usd < 0": (tx, b) =>
        tx.insert(purchaseLines).values(line(b, { unitCostUsd: "-1" })),
      "sale_price_usd < 0": (tx, b) =>
        tx.insert(purchaseLines).values(line(b, { salePriceUsd: "-1" })),
    },
  },
  {
    constraint: "purchase_lines_supplier_rate_check",
    valid: (tx, b) => tx.insert(purchaseLines).values(line(b, { supplierRate: "201" })),
    invalid: {
      zero: (tx, b) => tx.insert(purchaseLines).values(line(b, { supplierRate: "0" })),
    },
  },
  {
    constraint: "purchase_lines_margin_check",
    valid: (tx, b) => tx.insert(purchaseLines).values(line(b, { margin: "0" })),
    invalid: {
      negative: (tx, b) => tx.insert(purchaseLines).values(line(b, { margin: "-0.1" })),
      "above 500 %": (tx, b) => tx.insert(purchaseLines).values(line(b, { margin: "6" })),
    },
  },
  {
    constraint: "purchase_lines_received_packs_check",
    valid: (tx, b) => tx.insert(purchaseLines).values(line(b, { packs: "3", receivedPacks: "3" })),
    invalid: {
      "more than bought": (tx, b) =>
        tx.insert(purchaseLines).values(line(b, { packs: "3", receivedPacks: "4" })),
      negative: (tx, b) => tx.insert(purchaseLines).values(line(b, { receivedPacks: "-1" })),
    },
  },
  {
    constraint: "purchase_lines_received_quantity_check",
    valid: (tx, b) => tx.insert(purchaseLines).values(line(b, { receivedQuantity: "24" })),
    invalid: {
      "more than gross": (tx, b) =>
        tx.insert(purchaseLines).values(line(b, { receivedQuantity: "24.0001" })),
      negative: (tx, b) => tx.insert(purchaseLines).values(line(b, { receivedQuantity: "-1" })),
    },
  },
  {
    constraint: "purchase_lines_received_costs_check",
    valid: (tx, b) =>
      tx.insert(purchaseLines).values(
        line(b, {
          receiptStatus: "partial",
          receivedPacks: "0.5",
          receivedQuantity: "12",
          receivedUsableQuantity: "11",
          receivedUnitCostUsd: "1.8182",
          receivedSalePriceUsd: "2.75",
        }),
      ),
    invalid: {
      "partial without its costs": (tx, b) =>
        tx.insert(purchaseLines).values(line(b, { receiptStatus: "partial" })),
      "costs on a received line": (tx, b) =>
        tx.insert(purchaseLines).values(
          line(b, {
            receiptStatus: "received",
            receivedUsableQuantity: "22",
            receivedUnitCostUsd: "0.9091",
            receivedSalePriceUsd: "1.40",
          }),
        ),
      "nothing usable": (tx, b) =>
        tx.insert(purchaseLines).values(
          line(b, {
            receiptStatus: "partial",
            receivedUsableQuantity: "0",
            receivedUnitCostUsd: "0",
            receivedSalePriceUsd: "0",
          }),
        ),
    },
  },
  // supplier_claims
  {
    constraint: "supplier_claims_amounts_check",
    valid: (tx, b) => tx.insert(supplierClaims).values(valid.supplierClaim(b)),
    invalid: {
      "missing_packs < 0": (tx, b) =>
        tx.insert(supplierClaims).values(valid.supplierClaim(b, { missingPacks: "-1" })),
      "amount_usd < 0": (tx, b) =>
        tx.insert(supplierClaims).values(valid.supplierClaim(b, { amountUsd: "-1" })),
    },
  },
  // price_lists / price_list_lines
  {
    constraint: "price_lists_sale_rate_check",
    valid: (tx, b) => tx.insert(priceLists).values(valid.priceList(b)),
    invalid: {
      zero: (tx, b) => tx.insert(priceLists).values(valid.priceList(b, { saleRate: "0" })),
    },
  },
  {
    constraint: "price_lists_published_check",
    valid: (tx, b) =>
      tx
        .insert(priceLists)
        .values(valid.priceList(b, { status: "published", publishedAt: new Date() })),
    invalid: {
      "published without date": (tx, b) =>
        tx.insert(priceLists).values(valid.priceList(b, { status: "published" })),
    },
  },
  {
    constraint: "price_list_lines_amounts_check",
    valid: (tx, b) => tx.insert(priceListLines).values(valid.priceListLine(b)),
    invalid: {
      "unit_cost_usd < 0": (tx, b) =>
        tx.insert(priceListLines).values(valid.priceListLine(b, { unitCostUsd: "-1" })),
      "price_usd < 0": (tx, b) =>
        tx.insert(priceListLines).values(valid.priceListLine(b, { priceUsd: "-1" })),
      "price_bs < 0": (tx, b) =>
        tx.insert(priceListLines).values(valid.priceListLine(b, { priceBs: "-1" })),
    },
  },
  {
    constraint: "price_list_lines_margin_check",
    valid: (tx, b) => tx.insert(priceListLines).values(valid.priceListLine(b, { margin: "5" })),
    invalid: {
      negative: (tx, b) =>
        tx.insert(priceListLines).values(valid.priceListLine(b, { margin: "-1" })),
      "above 500 %": (tx, b) =>
        tx.insert(priceListLines).values(valid.priceListLine(b, { margin: "5.5" })),
    },
  },
  // daily close
  {
    constraint: "daily_closes_rate_check",
    valid: (tx, b) => tx.insert(dailyCloses).values(valid.dailyClose(b)),
    invalid: { zero: (tx, b) => tx.insert(dailyCloses).values(valid.dailyClose(b, { rate: "0" })) },
  },
  {
    constraint: "daily_closes_amounts_check",
    valid: (tx, b) => tx.insert(dailyCloses).values(valid.dailyClose(b, { totalUsd: "0" })),
    invalid: {
      "total_usd < 0": (tx, b) =>
        tx.insert(dailyCloses).values(valid.dailyClose(b, { totalUsd: "-1" })),
      "credit_sold_bs < 0": (tx, b) =>
        tx.insert(dailyCloses).values(valid.dailyClose(b, { creditSoldBs: "-1" })),
    },
  },
  {
    constraint: "daily_close_payments_amounts_check",
    valid: (tx, b) => tx.insert(dailyClosePayments).values(valid.dailyClosePayment(b)),
    invalid: {
      "amount < 0": (tx, b) =>
        tx.insert(dailyClosePayments).values(valid.dailyClosePayment(b, { amount: "-1" })),
      "amount_usd < 0": (tx, b) =>
        tx.insert(dailyClosePayments).values(valid.dailyClosePayment(b, { amountUsd: "-1" })),
    },
  },
  // receivables
  {
    constraint: "customer_credit_entries_amounts_check",
    valid: (tx, b) => tx.insert(customerCreditEntries).values(valid.creditEntry(b)),
    invalid: {
      "amount_bs < 0": (tx, b) =>
        tx.insert(customerCreditEntries).values(valid.creditEntry(b, { amountBs: "-1" })),
      "amount_usd < 0": (tx, b) =>
        tx.insert(customerCreditEntries).values(valid.creditEntry(b, { amountUsd: "-1" })),
    },
  },
  {
    constraint: "customer_credit_entries_rate_check",
    valid: (tx, b) => tx.insert(customerCreditEntries).values(valid.creditEntry(b)),
    invalid: {
      zero: (tx, b) => tx.insert(customerCreditEntries).values(valid.creditEntry(b, { rate: "0" })),
    },
  },
  // payables
  {
    constraint: "payables_amount_check",
    valid: (tx, b) => tx.insert(payables).values(valid.payable(b)),
    invalid: {
      negative: (tx, b) => tx.insert(payables).values(valid.payable(b, { amountUsd: "-1" })),
    },
  },
  {
    constraint: "payables_due_on_check",
    valid: (tx, b) => tx.insert(payables).values(valid.payable(b, { dueOn: "2026-10-12" })),
    invalid: {
      "due before issued": (tx, b) =>
        tx.insert(payables).values(valid.payable(b, { dueOn: "2026-10-11" })),
    },
  },
  {
    constraint: "payable_payments_amounts_check",
    valid: (tx, b) => tx.insert(payablePayments).values(valid.payablePayment(b)),
    invalid: {
      "amount_usd < 0": (tx, b) =>
        tx.insert(payablePayments).values(valid.payablePayment(b, { amountUsd: "-1" })),
      "amount_bs < 0": (tx, b) =>
        tx.insert(payablePayments).values(valid.payablePayment(b, { amountBs: "-1" })),
    },
  },
  {
    constraint: "payable_payments_rate_check",
    valid: (tx, b) => tx.insert(payablePayments).values(valid.payablePayment(b)),
    invalid: {
      zero: (tx, b) => tx.insert(payablePayments).values(valid.payablePayment(b, { rate: "0" })),
    },
  },
  // expenses
  {
    constraint: "recurring_expenses_amount_check",
    valid: (tx, b) => tx.insert(recurringExpenses).values(valid.recurringExpense(b)),
    invalid: {
      negative: (tx, b) =>
        tx.insert(recurringExpenses).values(valid.recurringExpense(b, { amountUsd: "-1" })),
    },
  },
  {
    constraint: "expenses_amounts_check",
    valid: (tx, b) => tx.insert(expenses).values(valid.expense(b)),
    invalid: {
      "amount_usd < 0": (tx, b) =>
        tx.insert(expenses).values(valid.expense(b, { amountUsd: "-1" })),
      "amount_bs < 0": (tx, b) => tx.insert(expenses).values(valid.expense(b, { amountBs: "-1" })),
    },
  },
  {
    constraint: "expenses_rate_check",
    valid: (tx, b) => tx.insert(expenses).values(valid.expense(b)),
    invalid: { zero: (tx, b) => tx.insert(expenses).values(valid.expense(b, { rate: "0" })) },
  },
  // payroll
  {
    constraint: "employees_weekly_salary_check",
    valid: (tx, b) => tx.insert(employees).values(valid.employee(b)),
    invalid: {
      negative: (tx, b) =>
        tx.insert(employees).values(valid.employee(b, { weeklySalaryUsd: "-1" })),
    },
  },
  {
    constraint: "payroll_payments_amounts_check",
    valid: (tx, b) =>
      tx
        .insert(payrollPayments)
        .values(validPayrollPayment(b.employee.id, { weekStart: "2026-10-19" })),
    invalid: {
      "salary_usd < 0": (tx, b) =>
        tx
          .insert(payrollPayments)
          .values(validPayrollPayment(b.employee.id, { weekStart: "2026-10-19", salaryUsd: "-1" })),
      "advances_usd < 0": (tx, b) =>
        tx
          .insert(payrollPayments)
          .values(
            validPayrollPayment(b.employee.id, { weekStart: "2026-10-19", advancesUsd: "-1" }),
          ),
      "paid_usd < 0": (tx, b) =>
        tx
          .insert(payrollPayments)
          .values(validPayrollPayment(b.employee.id, { weekStart: "2026-10-19", paidUsd: "-1" })),
    },
  },
  {
    constraint: "salary_advances_amounts_check",
    valid: (tx, b) => tx.insert(salaryAdvances).values(valid.salaryAdvance(b)),
    invalid: {
      "amount_usd < 0": (tx, b) =>
        tx.insert(salaryAdvances).values(valid.salaryAdvance(b, { amountUsd: "-1" })),
      "amount_bs < 0": (tx, b) =>
        tx.insert(salaryAdvances).values(valid.salaryAdvance(b, { amountBs: "-1" })),
    },
  },
  {
    constraint: "salary_advances_rate_check",
    valid: (tx, b) => tx.insert(salaryAdvances).values(valid.salaryAdvance(b)),
    invalid: {
      zero: (tx, b) => tx.insert(salaryAdvances).values(valid.salaryAdvance(b, { rate: "0" })),
    },
  },
];

describe("CHECK constraints", () => {
  test("every CHECK constraint in the database has a test case", async () => {
    const rows = await testConnection().db.execute<{ conname: string }>(
      sql`SELECT conname FROM pg_constraint
          WHERE contype = 'c' AND connamespace = 'public'::regnamespace ORDER BY conname`,
    );
    const inDatabase = rows.map((r) => r.conname);
    const tested = CASES.map((c) => c.constraint).sort();

    expect(inDatabase.length).toBeGreaterThan(0);
    expect(tested).toEqual(inDatabase);
  });

  for (const { constraint, valid: validWrite, invalid } of CASES) {
    describe(constraint, () => {
      test("accepts a valid row", async () => {
        await inRollback(async (tx) => {
          const base = await createBase(tx);
          await expectOk(tx, (sp) => validWrite(sp, base));
        });
      });

      for (const [label, write] of Object.entries(invalid)) {
        test(`rejects: ${label}`, async () => {
          await inRollback(async (tx) => {
            const base = await createBase(tx);
            await expectPgError(tx, (sp) => write(sp, base), {
              code: PG_CHECK_VIOLATION,
              constraint,
            });
          });
        });
      }
    });
  }
});
