import Decimal from "decimal.js";

/**
 * Montos, tasas, kilos y márgenes viajan como string y se calculan con decimal.js
 * (nunca con number): 0.1 + 0.2 debe dar "0.3", no 0.30000000000000004.
 */

function toDecimal(value: string, name: string): Decimal {
  try {
    const d = new Decimal(value);
    if (!d.isFinite()) throw new Error("no finito");
    return d;
  } catch {
    throw new TypeError(`${name} no es un número decimal válido: "${value}"`);
  }
}

/** Suma exacta de dos decimales en string. Devuelve notación plana (nunca exponencial). */
export function sumar(a: string, b: string): string {
  return toDecimal(a, "a").plus(toDecimal(b, "b")).toFixed();
}
