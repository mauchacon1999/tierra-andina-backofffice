# Payables (cuentas por pagar)

Supplier invoices on credit and their partial payments (docs/plan.md phase 3). Owner only.

Two kinds of purchase:

1. **Merchandise** that is resold (the bananas and avocados a supplier always gives on credit).
2. **Supplies / expenses** outside the sale inventory (a seller who shows up with bags, the
   bread invoice).

## Suppliers

- Name, phone, notes.
- One or more **pago móvil accounts** (`supplier_payment_accounts`): bank code, phone,
  cédula/RIF. The bank name comes from `VE_BANKS` (`@ta/core` `mobile-payment.ts`).
- Validated on save: bank code in the official list, phone with a mobile prefix
  (0412, 0414, 0416, 0422, 0424, 0426) stored as 11 digits, cédula/RIF with a V/E/J/G/P letter
  and no dots.
- A supplier can be created quickly from the invoice form (a seller who shows up unannounced).

## Invoices

- Code generated per store, sequential: `CXP-000123`. The supplier's own invoice number is
  not recorded.
- Supplier, issue date and due date (due ≥ issue). A manual invoice requires both, typed by
  the owner; an invoice created from a Coche trip has no due date until the owner sets it.
- **Currency** USD (default) or Bs, as agreed with the supplier. Lines, total and balance are in
  that currency.
- Paying a supplies invoice does **not** also create an `expenses` row (it would count twice).
- Lines can be edited while the invoice has no payments. Only an invoice without payments can
  be voided.

### Where the lines come from (owner, 2026-10-18)

Merchandise always goes through the **purchase form**, so its cost, margin and sale price are
computed and the price list is updated. Supplies go through the manual invoice form.

| Source                                     | Lines                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Manual invoice** (supplies)              | 1..50 free items: description + expense category, quantity > 0, unit (`kg`, `unit`, `sack` = bulto, `pack` = paquete), unit price; subtotal = quantity × price (`payableLineSubtotal`).                                                                                                                                                                                                                                        |
| **Local purchase** (merchandise on credit) | Products from a supplier who delivers to the shop (bananas, avocados): same form and costing as a trip line (shrinkage, margin), supplier rate = BCV of the day (no Coche premium), no truck receipt. Saving it updates the price list with those products; on credit (the default) it also creates the invoice, paid in cash (the panela, sometimes) it only updates costs and prices. It does not block the open Coche trip. |
| **Coche trip line on credit**              | A trip line marked credit requires its supplier. Closing the trip creates one USD invoice per supplier with its credit lines.                                                                                                                                                                                                                                                                                                  |

A product line of an invoice points to its purchase line; its subtotal is the line's total
(USD, or Bs for a Bs invoice).

How it works in the API:

- A local purchase is a purchase trip with `kind: "local"` and its supplier
  (`POST /purchase-trips`). Its lines use the same endpoints as a Coche trip; they take the
  purchase's supplier and the BCV as supplier rate. Several may be open at once, they are not
  listed with the Coche trips (`?kind=local`) and never reach the truck receipt.
- At Coche a line on credit must name its supplier (422 on `supplierId`).
- Closing any trip (`POST /purchase-trips/:id/close`) publishes the price list and creates one
  invoice per supplier with its credit lines, in `payableCurrency` (USD by default) and due on
  `payableDueOn` (or none until `PATCH /payables/:id/terms`). A local purchase's lines are
  marked received first. Its invoices cannot be replaced (`409 PAYABLE_FROM_PURCHASE`).

### Status (derived, never typed — `payableStatus`)

| Status    | When                                               |
| --------- | -------------------------------------------------- |
| `voided`  | the owner voided it (wins over everything)         |
| `paid`    | nothing is owed                                    |
| `overdue` | something is owed and the due date is before today |
| `pending` | nothing paid yet                                   |
| `partial` | part paid                                          |

## Payments

- Several partial payments per invoice. Each one: date, method, amount, rate, pago móvil
  reference, destination account, note.
- Methods (`PAYABLE_PAYMENT_METHODS`, separate from the daily close's sale methods):
  `mobile_payment`, `bank_transfer`, `cash_bs` (Bs) and `cash_usd` ("divisa", USD). The method
  sets the payment's currency.
- The rate is the BCV rate of the payment day (suggested, editable). A USD invoice paid in Bs
  and a Bs invoice paid in dollars are converted with it (`settlePayment`). Every payment keeps
  USD, Bs and the rate.
- Paying exactly the balance shown in the other currency (2 decimals) settles the invoice with
  nothing left. Paying more than the balance is rejected (`PAYMENT_EXCEEDS_BALANCE`); the
  amount is typed by the owner (full balance or less).

## Copy for pago móvil

On the invoice detail, one **"Copiar para pago móvil"** button per supplier account. It copies
plain text that the bank apps' "Pegar datos" reads (BDVApp → PagomóvilBDV → Pegar datos):

```
0102
04141234567
V12345678
1234,56
```

Bank code, phone (11 digits), cédula/RIF (letter, no dots), amount = **balance in Bs**
(`balanceInBs`: a USD invoice at today's BCV rate, shown on screen before copying; 2 decimals,
comma, no thousands separator). The format lives only in `formatPagoMovilClipboard`. Extra
buttons copy each value alone (banks without "Pegar datos"); a short "Copiado" notice follows
each copy.

## API (owner; examples in docs/api.http)

| Endpoint                                                  | What                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------- |
| `GET/POST /suppliers`, `GET/PATCH /suppliers/:id`         | suppliers with notes; the detail lists the accounts            |
| `POST /suppliers/:id/accounts`, `PUT/DELETE …/:accountId` | add, replace or deactivate a pago móvil account                |
| `GET /expense-categories`                                 | categories for supply lines                                    |
| `GET /payables?status=&supplierId=&page=&pageSize=`       | invoices, newest first, with the filter's balance per currency |
| `POST /payables`, `PUT /payables/:id`                     | create or replace a supplies invoice (no payments yet)         |
| `GET /payables/:id`                                       | invoice with lines and payments                                |
| `PATCH /payables/:id/terms`                               | due date and note (any invoice not voided)                     |
| `POST /payables/:id/void`                                 | void (no payments)                                             |
| `POST /payables/:id/payments`, `DELETE …/:paymentId`      | record or take back a payment                                  |
| `GET /payables/:id/mobile-payment`                        | balance in Bs at today's BCV and the clipboard per account     |

The home briefing shows the open invoices and what they owe, USD and Bs apart.

## Screens (owner)

- **Cuentas por pagar** `/payables`: status filter, what is still owed in USD and in Bs, the
  invoices (code, supplier, dates, total, balance, status).
- **Nueva factura** `/payables/new` (and **Editar** `/payables/[id]/edit` while it has no
  payments): supplier or "Nuevo proveedor" (shown instead of the invoice form), currency,
  issue and due dates, lines with their subtotal and the total while typing.
- **Factura** `/payables/[id]`: amounts, lines (merchandise says it comes from a purchase),
  payments (delete one by mistake), **Marcar como pagada** (a payment for the whole balance:
  choose the method and rate, the exact amount follows), **Registrar abono** (method → currency, the day's BCV rate
  suggested, "Pagar todo" with the exact amount, what it takes off the balance), **Cambiar
  vencimiento**, **Anular**, and **Pagar por pago móvil**: today's amount in Bs with the rate
  used, "Copiar para pago móvil" per account and a copy button per value, with "Copiado".
- **Proveedores** `/suppliers` and `/suppliers/[id]`: data, notes, active, and the pago móvil
  accounts (add, edit, remove).
- **Compras locales** `/local-purchases`: start one (supplier, day; the day's BCV rate must be
  set), continue the ones in progress, see the saved ones. Its screen is the trip screen
  (`/purchases/[id]`): supplier and BCV rate in the header, the product form always open (on
  credit by default), and **Guardar compra**, which asks the invoice's currency and due date
  when something is on credit.
- At Coche, a line **A crédito** asks which supplier is owed. Every closed trip links the
  invoices it created.

## Later (not built)

- QR Suiche 7B: do not invent the format. Either keep the QR image the supplier shares, or
  generate it only with the official specification.
