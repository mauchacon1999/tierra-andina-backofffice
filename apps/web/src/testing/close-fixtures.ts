import type { DailyClose, PaymentMethod } from "@ta/validators";

/* API-shaped data for daily close tests. Methods in the Excel's order. */

export const METHODS: PaymentMethod[] = [
  {
    id: "01a14314-2825-7000-a1d1-bdf734d06001",
    code: "card_terminal",
    name: "Punto de venta",
    currency: "VES",
    sortOrder: 1,
  },
  {
    id: "01a14314-2825-7000-a1d1-bdf734d06002",
    code: "cash_bs",
    name: "Efectivo Bs",
    currency: "VES",
    sortOrder: 2,
  },
  {
    id: "01a14314-2825-7000-a1d1-bdf734d06003",
    code: "cash_usd",
    name: "Efectivo USD",
    currency: "USD",
    sortOrder: 3,
  },
  {
    id: "01a14314-2825-7000-a1d1-bdf734d06004",
    code: "mobile_payment",
    name: "Pago móvil",
    currency: "VES",
    sortOrder: 4,
  },
];

const pay = (index: number, amount: string) => {
  const method = METHODS[index]!;
  return {
    paymentMethodId: method.id,
    code: method.code,
    name: method.name,
    currency: method.currency,
    amount,
  };
};

/** Tuesday 13/10/2026 from the shop's Excel, as the API returns it. */
export const TUESDAY_CLOSE: DailyClose = {
  id: "01a14314-2825-7000-a1d1-bdf734d06100",
  businessDate: "2026-10-13",
  status: "submitted",
  cardBatch: "16",
  cashDestination: "kept",
  note: null,
  submittedBy: { id: "01a14314-2825-7000-a1d1-bdf734d06200", name: "Encargada" },
  submittedAt: "2026-10-13T22:00:00.000Z",
  approvedBy: null,
  approvedAt: null,
  payments: [
    pay(0, "163344.0000"),
    pay(1, "5500.0000"),
    pay(2, "18000.0000"),
    pay(3, "83569.0000"),
  ],
  credits: [],
  expenses: [
    {
      id: "01a14314-2825-7000-a1d1-bdf734d06300",
      concept: "Bolsas",
      amount: "379.0000",
      currency: "USD",
    },
  ],
  totals: {
    collected: { VES: "252413.0000", USD: "18000.0000" },
    credit: { VES: "0.0000", USD: "0.0000" },
    expenses: { VES: "0.0000", USD: "379.0000" },
  },
};
