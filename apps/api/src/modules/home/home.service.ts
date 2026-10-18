import {
  compareDecimals,
  payableBalance,
  subtractTotals,
  totalsByCurrency,
  weekContaining,
  type CurrencyTotals,
} from "@ta/core";
import type { Database } from "@ta/db";
import type { HomeAlertCode, HomeBriefing } from "@ta/validators";

import {
  countSubmittedCloses,
  findClosesInRange,
  findPayments,
} from "@/modules/daily-closes/daily-closes.repository";
import { getDailyRates } from "@/modules/exchange-rates/exchange-rates.service";
import { findCurrentList } from "@/modules/price-lists/price-lists.repository";
import { getPriceProposal } from "@/modules/price-lists/price-lists.service";

import {
  countOpenShoppingItems,
  countPendingReceipts,
  findCreditEntries,
  findOpenPayables,
  findPayablePaymentAmounts,
} from "./home.repository";

const CASH_METHODS = new Set(["cash_bs", "cash_usd"]);

const pair = (totals: CurrencyTotals): HomeBriefing["credit"] => ({
  usd: totals.USD,
  bs: totals.VES,
});

/**
 * The owner's home: this week's closes, open debts, fiado balances and the
 * alerts that follow from real rows. `today` is a business date (YYYY-MM-DD).
 */
export async function getHomeBriefing(
  db: Database,
  storeId: string,
  today: string,
): Promise<HomeBriefing> {
  const week = weekContaining(today);
  const [closes, credits, debts, pendingCloses, rates, shopping, receipts, priceList, proposal] =
    await Promise.all([
      findClosesInRange(db, storeId, week.from, week.to),
      findCreditEntries(db, storeId),
      findOpenPayables(db, storeId),
      countSubmittedCloses(db, storeId),
      getDailyRates(db, storeId, today),
      countOpenShoppingItems(db, storeId),
      countPendingReceipts(db, storeId),
      findCurrentList(db, storeId),
      getPriceProposal(db, storeId, today),
    ]);

  const payments = await findPayments(
    db,
    closes.map((close) => close.id),
  );
  const destinationOf = new Map(closes.map((close) => [close.id, close.cashDestination]));
  const movements = payments.map((payment) => ({
    amount: payment.amount,
    currency: payment.currency,
    code: payment.code,
    destination: destinationOf.get(payment.dailyCloseId),
  }));
  const collected = totalsByCurrency(movements);
  const cash = (destination: "kept" | "deposited"): CurrencyTotals =>
    totalsByCurrency(
      movements.filter((row) => row.destination === destination && CASH_METHODS.has(row.code)),
    );

  const given = totalsByCurrency(
    credits
      .filter((row) => row.kind === "credit")
      .map((row) => ({ amount: row.amount, currency: row.currency })),
  );
  const returned = totalsByCurrency(
    credits
      .filter((row) => row.kind === "payment")
      .map((row) => ({ amount: row.amount, currency: row.currency })),
  );

  const appliedByDebt = new Map<string, string[]>();
  for (const payment of await findPayablePaymentAmounts(
    db,
    debts.map((debt) => debt.id),
  )) {
    appliedByDebt.set(payment.payableId, [
      ...(appliedByDebt.get(payment.payableId) ?? []),
      payment.applied,
    ]);
  }
  const openDebts = debts.flatMap((debt) => {
    const balance = payableBalance(debt.total, appliedByDebt.get(debt.id) ?? []);
    return compareDecimals(balance, "0") > 0 ? [{ amount: balance, currency: debt.currency }] : [];
  });
  const remaining = totalsByCurrency(openDebts);

  const missingRates = (["bcv", "market", "sale"] as const).filter((kind) => rates[kind] === null);
  const alerts: HomeBriefing["alerts"] = [];
  const push = (code: HomeAlertCode, count: number): void => {
    if (count > 0) alerts.push({ code, count });
  };
  push("closes_pending", pendingCloses);
  push("rates_missing", missingRates.length);
  push("shopping_open", shopping);
  push("receipts_pending", receipts);
  push("no_price_list", priceList ? 0 : 1);
  push("price_proposal", proposal?.lines.filter((line) => line.changed).length ?? 0);
  push("bcv_changed", proposal?.bcvChanged ? 1 : 0);

  return {
    week: {
      from: week.from,
      to: week.to,
      closeCount: closes.length,
      collected: pair(collected),
      deposited: pair(cash("deposited")),
      kept: pair(cash("kept")),
    },
    payables: { count: openDebts.length, remaining: pair(remaining) },
    credit: pair(subtractTotals(given, returned)),
    alerts,
  };
}
