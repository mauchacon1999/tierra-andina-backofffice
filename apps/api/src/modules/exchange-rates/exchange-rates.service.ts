import type { Database, Executor } from "@ta/db";
import type { DailyRates, SetDailyRates } from "@ta/validators";

import { recordAudit } from "@/lib/audit";
import type { Actor } from "@/lib/types";

import {
  findRatesInRange,
  upsertRate,
  type RateKind,
  type RateRecord,
} from "./exchange-rates.repository";

function emptyDay(businessDate: string): DailyRates {
  return { businessDate, bcv: null, market: null, sale: null };
}

function groupByDay(rows: RateRecord[]): Map<string, DailyRates> {
  const days = new Map<string, DailyRates>();
  for (const row of rows) {
    const day = days.get(row.businessDate) ?? emptyDay(row.businessDate);
    day[row.kind] = row.value;
    days.set(row.businessDate, day);
  }
  return days;
}

/** Days in [from, to] that have at least one rate, newest first. */
export async function listDailyRates(
  db: Executor,
  storeId: string,
  from: string,
  to: string,
): Promise<DailyRates[]> {
  return [...groupByDay(await findRatesInRange(db, storeId, from, to)).values()];
}

/** The rates of one day; missing ones are null. */
export async function getDailyRates(
  db: Executor,
  storeId: string,
  businessDate: string,
): Promise<DailyRates> {
  const rows = await findRatesInRange(db, storeId, businessDate, businessDate);
  return groupByDay(rows).get(businessDate) ?? emptyDay(businessDate);
}

/**
 * Sets the day's rates entered by the owner. BCV is global (no store); market (Coche) and sale
 * belong to the actor's store. Each changed rate is audited with its previous value.
 */
export async function setDailyRates(
  db: Database,
  actor: Actor,
  businessDate: string,
  input: SetDailyRates,
): Promise<DailyRates> {
  await db.transaction(async (tx) => {
    const before = await getDailyRates(tx, actor.storeId, businessDate);
    for (const kind of ["bcv", "market", "sale"] as const satisfies readonly RateKind[]) {
      const value = input[kind];
      if (value === undefined) continue;
      const row = await upsertRate(tx, {
        storeId: kind === "bcv" ? null : actor.storeId,
        businessDate,
        kind,
        value,
        userId: actor.userId,
      });
      await recordAudit(tx, actor, {
        tableName: "exchange_rates",
        recordId: row.id,
        action: before[kind] === null ? "insert" : "update",
        changes: { kind, businessDate, value: { from: before[kind], to: row.value } },
      });
    }
  });
  return getDailyRates(db, actor.storeId, businessDate);
}
