import type {
  customerCreditEntries,
  dailyClosePayments,
  exchangeRates,
  expenses,
  payablePayments,
  priceListLines,
  salaryAdvances,
  supplierClaims,
} from "../schema";
import {
  customers,
  dailyCloses,
  employees,
  expenseCategories,
  payables,
  paymentMethods,
  payrollPayments,
  priceLists,
  productCategories,
  products,
  purchaseLines,
  purchaseTrips,
  recurringExpenses,
  stores,
  suppliers,
  users,
} from "../schema";
import type { Tx } from "./test-db";

/*
 * Valid rows for every table, built on the tomato reference case of domain-model §3.3
 * (20 USD crate, 24 kg, shrinkage 2, rates 200, margin 0.50 → 0.9091 USD/kg → 1.40 USD).
 * Each `valid*` builder returns a row that inserts cleanly; tests override one field to break
 * exactly one constraint.
 */

type Insert<T extends { $inferInsert: unknown }> = T["$inferInsert"];

let counter = 0;
/** Unique suffix so fixture rows never collide with seed rows or each other. */
export function uniq(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}-${Bun.randomUUIDv7().slice(-6)}`;
}

async function one<T>(rows: Promise<T[]>): Promise<T> {
  const [row] = await rows;
  if (!row) throw new Error("[fixtures] insert returned no row");
  return row;
}

/** Parents shared by the valid rows of one test. Everything lives inside the test transaction. */
export async function createBase(tx: Tx) {
  const user = await one(
    tx
      .insert(users)
      .values({ name: "Tester", email: `${uniq("user")}@test.local` })
      .returning(),
  );
  const store = await one(
    tx
      .insert(stores)
      .values({ name: uniq("Store") })
      .returning(),
  );
  const category = await one(
    tx
      .insert(productCategories)
      .values({ code: uniq("cat"), name: "Categoría" })
      .returning(),
  );
  const product = await one(tx.insert(products).values(validProduct(category.id)).returning());
  const supplier = await one(
    tx.insert(suppliers).values({ name: "Puesto 7", kind: "wholesale_stall" }).returning(),
  );
  const trip = await one(
    tx
      .insert(purchaseTrips)
      .values({ storeId: store.id, businessDate: "2026-10-12", bcvRate: "200" })
      .returning(),
  );
  const line = await one(
    tx
      .insert(purchaseLines)
      .values(validPurchaseLine(trip.id, product.id, supplier.id))
      .returning(),
  );
  const priceList = await one(
    tx.insert(priceLists).values({ storeId: store.id, saleRate: "210" }).returning(),
  );
  const paymentMethod = await one(
    tx
      .insert(paymentMethods)
      .values({ code: uniq("pm"), name: "Método", currency: "VES" })
      .returning(),
  );
  const dailyClose = await one(
    tx
      .insert(dailyCloses)
      .values({
        storeId: store.id,
        businessDate: "2026-10-12",
        submittedBy: user.id,
        rate: "210",
        totalUsd: "100",
        cashDestination: "kept",
      })
      .returning(),
  );
  const customer = await one(
    tx.insert(customers).values({ storeId: store.id, name: "Sra. Carmen" }).returning(),
  );
  const payable = await one(
    tx
      .insert(payables)
      .values({ storeId: store.id, concept: "Pan", amountUsd: "10", issuedOn: "2026-10-12" })
      .returning(),
  );
  const expenseCategory = await one(
    tx
      .insert(expenseCategories)
      .values({ code: uniq("exp"), name: "Bolsas", kind: "variable" })
      .returning(),
  );
  const recurringExpense = await one(
    tx
      .insert(recurringExpenses)
      .values({
        storeId: store.id,
        categoryId: expenseCategory.id,
        amountUsd: "50",
        frequency: "monthly",
      })
      .returning(),
  );
  const employee = await one(
    tx
      .insert(employees)
      .values({ storeId: store.id, name: "Luis", weeklySalaryUsd: "50" })
      .returning(),
  );
  const payrollPayment = await one(
    tx.insert(payrollPayments).values(validPayrollPayment(employee.id)).returning(),
  );

  return {
    user,
    store,
    category,
    product,
    supplier,
    trip,
    line,
    priceList,
    paymentMethod,
    dailyClose,
    customer,
    payable,
    expenseCategory,
    recurringExpense,
    employee,
    payrollPayment,
  };
}

export type Base = Awaited<ReturnType<typeof createBase>>;

export function validProduct(
  categoryId: string,
  overrides: Partial<Insert<typeof products>> = {},
): Insert<typeof products> {
  const name = uniq("Tomate");
  return {
    name,
    normalizedName: name.toLowerCase(),
    categoryId,
    purchaseUnit: "crate",
    saleUnit: "kg",
    defaultPackQuantity: "24",
    lastShrinkage: "2",
    lastMargin: "0.5",
    ...overrides,
  };
}

export function validPurchaseLine(
  tripId: string,
  productId: string,
  supplierId: string | null,
  overrides: Partial<Insert<typeof purchaseLines>> = {},
): Insert<typeof purchaseLines> {
  return {
    tripId,
    productId,
    supplierId,
    purchaseUnit: "crate",
    packs: "1",
    grossQuantity: "24",
    shrinkage: "2",
    usableQuantity: "22",
    quotedPriceUsd: "20",
    amountBs: "4000",
    supplierRate: "200",
    realCostUsd: "20",
    unitCostUsd: "0.9091",
    margin: "0.5",
    salePriceUsd: "1.40",
    paymentStatus: "paid",
    ...overrides,
  };
}

export function validPayrollPayment(
  employeeId: string,
  overrides: Partial<Insert<typeof payrollPayments>> = {},
): Insert<typeof payrollPayments> {
  return {
    employeeId,
    weekStart: "2026-10-12",
    salaryUsd: "50",
    advancesUsd: "10",
    paidUsd: "40",
    paidOn: "2026-10-17",
    ...overrides,
  };
}

/** Valid row builders for the tables that are only children (nothing references them). */
export const valid = {
  exchangeRate: (b: Base, o: Partial<Insert<typeof exchangeRates>> = {}) =>
    ({
      storeId: b.store.id,
      businessDate: "2026-10-12",
      kind: "sale",
      value: "210",
      ...o,
    }) satisfies Insert<typeof exchangeRates>,
  supplierClaim: (b: Base, o: Partial<Insert<typeof supplierClaims>> = {}) =>
    ({
      purchaseLineId: b.line.id,
      supplierId: b.supplier.id,
      missingPacks: "1",
      amountUsd: "20",
      ...o,
    }) satisfies Insert<typeof supplierClaims>,
  priceList: (b: Base, o: Partial<Insert<typeof priceLists>> = {}) =>
    ({ storeId: b.store.id, saleRate: "210", ...o }) satisfies Insert<typeof priceLists>,
  priceListLine: (b: Base, o: Partial<Insert<typeof priceListLines>> = {}) =>
    ({
      priceListId: b.priceList.id,
      productId: b.product.id,
      unitCostUsd: "0.9091",
      margin: "0.5",
      priceUsd: "1.40",
      priceBs: "294",
      ...o,
    }) satisfies Insert<typeof priceListLines>,
  purchaseTrip: (b: Base, o: Partial<Insert<typeof purchaseTrips>> = {}) =>
    ({
      storeId: b.store.id,
      businessDate: "2026-10-15",
      bcvRate: "200",
      ...o,
    }) satisfies Insert<typeof purchaseTrips>,
  dailyClose: (b: Base, o: Partial<Insert<typeof dailyCloses>> = {}) =>
    ({
      storeId: b.store.id,
      businessDate: "2026-10-13",
      submittedBy: b.user.id,
      rate: "210",
      totalUsd: "100",
      cashDestination: "deposited",
      ...o,
    }) satisfies Insert<typeof dailyCloses>,
  dailyClosePayment: (b: Base, o: Partial<Insert<typeof dailyClosePayments>> = {}) =>
    ({
      dailyCloseId: b.dailyClose.id,
      paymentMethodId: b.paymentMethod.id,
      amount: "2100",
      amountUsd: "10",
      ...o,
    }) satisfies Insert<typeof dailyClosePayments>,
  creditEntry: (b: Base, o: Partial<Insert<typeof customerCreditEntries>> = {}) =>
    ({
      customerId: b.customer.id,
      kind: "credit",
      businessDate: "2026-10-12",
      amountBs: "210",
      amountUsd: "1",
      rate: "210",
      ...o,
    }) satisfies Insert<typeof customerCreditEntries>,
  payable: (b: Base, o: Partial<Insert<typeof payables>> = {}) =>
    ({
      storeId: b.store.id,
      concept: "Bolsas",
      amountUsd: "10",
      issuedOn: "2026-10-12",
      ...o,
    }) satisfies Insert<typeof payables>,
  payablePayment: (b: Base, o: Partial<Insert<typeof payablePayments>> = {}) =>
    ({
      payableId: b.payable.id,
      paidOn: "2026-10-13",
      amountUsd: "5",
      amountBs: "1000",
      rate: "200",
      paymentMethodId: b.paymentMethod.id,
      ...o,
    }) satisfies Insert<typeof payablePayments>,
  recurringExpense: (b: Base, o: Partial<Insert<typeof recurringExpenses>> = {}) =>
    ({
      storeId: b.store.id,
      categoryId: b.expenseCategory.id,
      amountUsd: "50",
      frequency: "weekly",
      ...o,
    }) satisfies Insert<typeof recurringExpenses>,
  expense: (b: Base, o: Partial<Insert<typeof expenses>> = {}) =>
    ({
      storeId: b.store.id,
      categoryId: b.expenseCategory.id,
      businessDate: "2026-10-12",
      amountUsd: "1",
      amountBs: "200",
      rate: "200",
      ...o,
    }) satisfies Insert<typeof expenses>,
  employee: (b: Base, o: Partial<Insert<typeof employees>> = {}) =>
    ({ storeId: b.store.id, name: "Ana", weeklySalaryUsd: "50", ...o }) satisfies Insert<
      typeof employees
    >,
  salaryAdvance: (b: Base, o: Partial<Insert<typeof salaryAdvances>> = {}) =>
    ({
      employeeId: b.employee.id,
      paidOn: "2026-10-14",
      amountUsd: "10",
      amountBs: "2000",
      rate: "200",
      ...o,
    }) satisfies Insert<typeof salaryAdvances>,
};
