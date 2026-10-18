import type {
  ExpenseCategory,
  MobilePaymentData,
  PayableDetail,
  Supplier,
  SupplierDetail,
} from "@ta/validators";

/* Fixtures for the payables and suppliers screens (docs/modules/payables.md). */

export const BAKERY: Supplier = {
  id: "0199f000-0000-7000-8000-0000000000b1",
  name: "Panadería La Esquina",
  kind: "local",
  phone: null,
  stallReference: null,
  notes: null,
  isActive: true,
};

export const BAKERY_DETAIL: SupplierDetail = {
  ...BAKERY,
  accounts: [
    {
      id: "0199f000-0000-7000-8000-0000000000a1",
      bankCode: "0102",
      bankName: "Banco de Venezuela",
      phone: "04141234567",
      idDocument: "V12345678",
      isActive: true,
    },
  ],
};

export const PACKAGING: ExpenseCategory = {
  id: "0199f000-0000-7000-8000-0000000000c1",
  code: "packaging",
  name: "Empaque",
  kind: "variable",
};

export const FOOD: ExpenseCategory = {
  id: "0199f000-0000-7000-8000-0000000000c2",
  code: "food",
  name: "Alimentación",
  kind: "variable",
};

/** 25 USD of bags and bread, 5 USD already paid. */
export const BREAD_INVOICE: PayableDetail = {
  id: "0199f000-0000-7000-8000-0000000000d1",
  code: "CXP-000007",
  supplierId: BAKERY.id,
  supplierName: BAKERY.name,
  currency: "USD",
  total: "25.0000",
  paid: "5.0000",
  balance: "20.0000",
  issuedOn: "2026-10-18",
  dueOn: "2026-10-25",
  status: "partial",
  tripId: null,
  note: null,
  voidedAt: null,
  lines: [
    {
      id: "0199f000-0000-7000-8000-0000000000e1",
      subtotal: "15.0000",
      description: "Bolsas medianas",
      expenseCategoryId: PACKAGING.id,
      expenseCategoryName: "Empaque",
      quantity: "10.0000",
      unit: "pack",
      unitPrice: "1.5000",
      purchaseLine: null,
    },
  ],
  payments: [],
};

export const MOBILE_PAYMENT: MobilePaymentData = {
  businessDate: "2026-10-18",
  currency: "USD",
  balance: "20.0000",
  bcvRate: "201.5550",
  amountBs: "4031.10",
  amountText: "4031,10",
  accounts: [{ ...BAKERY_DETAIL.accounts[0]!, clipboard: "0102\n04141234567\nV12345678\n4031,10" }],
};
