import type { ManualPriceRow } from "@ta/validators";

export type PricedRow = ManualPriceRow & { priceBs: string };

/** Products switched on for WhatsApp that have a price, in the list's order (by name). */
export function whatsappRows(rows: readonly ManualPriceRow[]): PricedRow[] {
  return rows.filter((row): row is PricedRow => row.shareOnWhatsapp && row.priceBs !== null);
}

export type WhatsappTextLabels = {
  /** First line ("*Tierra Andina — Precios del 20/10/2026*"). */
  title: string;
  /** One product ("Tomate perita: 450,00 Bs/kg"). */
  line: (row: PricedRow) => string;
};

/** The text pasted in the WhatsApp group: a title and one line per product. */
export function buildWhatsappText(rows: readonly PricedRow[], labels: WhatsappTextLabels): string {
  return [labels.title, ...rows.map(labels.line)].join("\n");
}
