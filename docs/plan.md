# Development Plan — Tierra Andina

Product plan for the Tierra Andina administrative system: what it does, in what order it is
built, and who uses it. Business rules and the database design live in
`docs/domain-model.md`; per-module specs live in `docs/modules/`.

---

## 1. Goal and scope

Replace the notebook, WhatsApp and Excel with one app that lets the owner control purchases,
prices, daily closes, expenses and debts without being at the shop.

**In the first version (basic control):**

- Purchase trips at the wholesale market (Monday and Thursday) with automatic costing.
- Truck receipt: each stall's goods confirmed on arrival at the truck.
- Sale price list in USD and Bs for the shop.
- Daily close submitted by the shop manager from the phone.
- Customer credit, supplier payables, fixed and variable expenses, weekly payroll.
- Weekly summary of sales, purchases, expenses and profit.

**Later:**

- Point of sale with scale (sales per product, inventory, real shrinkage) — phase 5.
- Fiscal invoicing stays on the current channel. This system is for internal control.

---

## 2. Current process (typical week)

| Day       | Who              | What                                                                        | Where it lives today  |
| --------- | ---------------- | --------------------------------------------------------------------------- | --------------------- |
| Monday    | Owner            | Buys at Coche: product, quantity, USD price, rate used, crate / bundle / kg | Notebook              |
| Monday    | Owner            | Calculates prices: quantity, shrinkage, unit cost, margin                   | Notebook + calculator |
| Tuesday   | Manager          | Receives the list and updates prices at the shop                            | Paper / WhatsApp      |
| Thursday  | Owner + manager  | Checks bank balance; manager dictates what is missing                       | Notebook              |
| Thursday  | Owner + receiver | Second trip; stalls send goods to the truck, receiver checks them           | Nothing               |
| Every day | Manager          | Close: card terminal, mobile payment, cash Bs, cash USD, customer credit    | WhatsApp → Excel      |
| As needed | Owner            | Pays local suppliers who give credit (bread, bags, bananas)                 | Memory                |
| Saturday  | Owner            | Pays employees, closes the week                                             | Excel                 |
| Sunday    | Owner            | Reviews the week's sales                                                    | Excel                 |

Weekends sell more, especially around paydays. Cash starts at zero every day.
Today the shop sells with a scale without software and a calculator.

---

## 3. Phases

Each phase is usable on its own. Phases 1 and 2 remove the notebook and WhatsApp and go first.

### Phase 0 — Foundation and catalogs

- [x] Monorepo, database, auth with roles (owner, manager, receiver) — sign-in on the web.
      "Usuarios" screen: the owner creates managers and receivers, edits name and role,
      deactivates them and sets their passwords (users never change their own).
- [ ] Products, suppliers, employees, expense categories, payment methods.
      (products done: catalog screens for the owner; suppliers: screens with pago móvil accounts;
      the rest pending)
- [x] Daily BCV rate, Coche (market) rate and sale rate — "Tasas del día" screen.
- [ ] Initial product catalog loaded from the owner's notebook.

Done when: every product the owner buys is loaded with its purchase and sale unit.

### Phase 1 — Purchases, truck receipt and price lists

- [x] "New purchase" on the phone: open a trip, add lines fast at each stall.
- [x] Per line: stall, supplier rate, packs, gross quantity, shrinkage, USD price, margin
      (last values suggested).
- [x] Live calculation of real cost, unit cost and sale price.
- [x] Payment status per line (paid / credit). A credit line names its supplier and becomes
      that supplier's invoice when the trip closes (docs/modules/payables.md).
- [x] Local purchases: goods a supplier brings to the shop (bananas, panela), costed with the
      same form at the BCV rate; on credit they become an invoice, paid in cash they only update
      prices.
- [x] Receiver view: live list of the trip, big buttons Received / Partial / Missing
      ("Recepción"; refreshes every 5 s; partial lines re-cost with what arrived).
- [ ] Push notification to the receiver for each line bought.
- [x] Live pending counter for the owner; warning before closing the trip.
- [~] ~~Supplier claims for partial or missing goods~~ — not in the system: the owner asks
  the stall in person (decision 2026-10-17).
- [x] On close, publish a price list in USD and Bs from what can be sold (sale rate + rounding).
- [~] ~~Share that list as image or text on WhatsApp~~ — not needed: the manager sees "Precios"
  in the app (owner, 2026-10-17).
- [x] Rate-change alert with a proposed list to approve (sale rate moves Bs; BCV only warns).
- [ ] Offline support for the purchase screen (no signal at the market).

Done when: a full Monday trip is recorded without the notebook and the manager receives
the list from the system.

### Phase 2 — Daily close

- [x] Manager form ("Cierre del día"): amount per payment method in its own currency (no rate:
      Bs and $ are never added), card terminal batch ("lote"), credit sales (customer + amount)
      and the day's expenses.
- [x] Cash destination: kept or deposited.
- [x] Notification to the owner when a close is submitted: live counter in the menu ("Cierres");
      push notifications come with the push task.
- [x] Owner view ("Cierres"): one row per day like the Excel (a column per method, totals per
      currency, batch, status); detail to correct and approve.
- [~] ~~Import history from the current Excel~~ — not needed: data starts from zero in the
  system (owner, 2026-10-17).

Done when: closes no longer arrive by WhatsApp and are no longer typed into Excel.

### Phase 3 — Debts, expenses and payroll

- [ ] Customer credit: balance, history, register payments.
- [x] Supplier payables with partial payments (docs/modules/payables.md): supplies invoices
      (USD or Bs), payments at the BCV rate, void, "Copiar para pago móvil". QR Suiche 7B later.
- [ ] Fixed (recurring) and variable expenses.
- [ ] Weekly payroll with advances.

Done when: the owner sees at a glance what is owed to him and what he owes.

### Phase 4 — Weekly summary

- [ ] Sales, purchases, expenses, payroll and profit for the week in USD.
- [ ] Week-over-week comparison, paydays highlighted.
- [ ] Sales by day of the week.
- [x] Shopping list before Coche: the owner marks what is missing; buying a product checks it
      off. The manager can use the same screen once that user exists (still pending in phase 0).

Done when: the Sunday review happens in the system, not in Excel.

### Phase 5 — Point of sale with scale

- [ ] Integrate the existing Python POS (RS-232 scale) through the API, reading the
      current price list.
- [ ] Sales per product, with automatic close per payment method.
- [ ] Inventory and real shrinkage per product; real margin vs planned margin.

Done when: the daily close comes straight from the POS and the owner knows which product
earns the most.

---

## 4. Roles

| Action                               | Owner | Manager | Receiver |
| ------------------------------------ | ----- | ------- | -------- |
| View current price list              | Yes   | Yes     | No       |
| Record purchases, costs and margins  | Yes   | No      | No       |
| Set truck receipt status             | Yes   | No      | Yes      |
| Publish price lists                  | Yes   | No      | No       |
| Submit daily close                   | Yes   | Yes     | No       |
| Edit a submitted close               | Yes   | No      | No       |
| Add shopping list items              | Yes   | Yes     | No       |
| Register customer credit payments    | Yes   | Yes     | No       |
| Assign tasks and change their status | Yes   | Yes     | Status   |
| Expenses, payables, payroll          | Yes   | No      | No       |
| Reports and weekly summary           | Yes   | No      | No       |

Every change is audited with user and time.

---

## 5. Architecture

```
Owner phone ─┐
Manager phone├─► Next.js PWA (apps/web) ──HTTP──► Hono API on Bun (apps/api) ──► PostgreSQL
Receiver phone┘                                          ▲
                                     Python POS (phase 5)┘
```

- One API and one database; every client goes through the API.
- The web never touches the database.
- Purchase screen works offline and syncs when the connection returns.
- Stack details and conventions: `CLAUDE.md`.

---

## 6. Open questions

Defaults are recorded in `docs/domain-model.md` §10 and module specs. Still to confirm with
the owner:

- [ ] Fixed expenses: list of concepts and frequency.
- [ ] Salary: fixed weekly or per day worked?
- [ ] Should the manager record discarded goods (real shrinkage) before the POS exists?
- [ ] Does the second employee get access to the system?
- [ ] Is anything bought by kilo and sold by unit?
