import Decimal from "decimal.js";

import { toDecimal } from "./decimal";
import { InvalidValueError } from "./errors";

/*
 * Pago móvil data of a supplier (docs/modules/payables.md). The clipboard text is what the
 * Venezuelan bank apps read with "Pegar datos" (BDVApp → PagomóvilBDV → Pegar datos): one value
 * per line, no labels.
 */

/** Banks of the Venezuelan payment system (SUDEBAN codes). */
export const VE_BANKS = [
  { code: "0102", name: "Banco de Venezuela" },
  { code: "0104", name: "Venezolano de Crédito" },
  { code: "0105", name: "Mercantil" },
  { code: "0108", name: "BBVA Provincial" },
  { code: "0114", name: "Bancaribe" },
  { code: "0115", name: "Banco Exterior" },
  { code: "0128", name: "Banco Caroní" },
  { code: "0134", name: "Banesco" },
  { code: "0137", name: "Sofitasa" },
  { code: "0138", name: "Banco Plaza" },
  { code: "0146", name: "Bangente" },
  { code: "0151", name: "BFC Banco Fondo Común" },
  { code: "0156", name: "100% Banco" },
  { code: "0157", name: "DelSur" },
  { code: "0163", name: "Banco del Tesoro" },
  { code: "0166", name: "Banco Agrícola de Venezuela" },
  { code: "0168", name: "Bancrecer" },
  { code: "0169", name: "R4 Banco Microfinanciero" },
  { code: "0171", name: "Banco Activo" },
  { code: "0172", name: "Bancamiga" },
  { code: "0173", name: "Banco Internacional de Desarrollo" },
  { code: "0174", name: "Banplus" },
  { code: "0175", name: "Banco Digital de los Trabajadores" },
  { code: "0177", name: "BANFANB" },
  { code: "0178", name: "N58 Banco Digital" },
  { code: "0191", name: "Banco Nacional de Crédito (BNC)" },
] as const;

export type BankCode = (typeof VE_BANKS)[number]["code"];

/** Mobile operators' prefixes accepted for pago móvil (Movilnet, Movistar, Digitel). */
export const MOBILE_PHONE_PREFIXES = ["0412", "0414", "0416", "0422", "0424", "0426"] as const;

/** Cédula (V, E), RIF (J, G) and passport (P). */
export const ID_DOCUMENT_PREFIXES = ["V", "E", "J", "G", "P"] as const;

const BANK_NAMES = new Map<string, string>(VE_BANKS.map((b) => [b.code, b.name]));
const PHONE_PATTERN = new RegExp(`^(${MOBILE_PHONE_PREFIXES.join("|")})\\d{7}$`);
const ID_DOCUMENT_PATTERN = new RegExp(`^[${ID_DOCUMENT_PREFIXES.join("")}]\\d{5,9}$`);

/** Whether the code is in `VE_BANKS`. */
export function isValidBankCode(code: string): code is BankCode {
  return BANK_NAMES.has(code);
}

/** The bank's name for a code of `VE_BANKS`, or `null` for an unknown code. */
export function bankName(code: string): string | null {
  return BANK_NAMES.get(code) ?? null;
}

/**
 * The phone as the banks want it: 11 digits, no separators. Spaces, dashes, dots and
 * parentheses are removed and the country code becomes the leading 0:
 * "0414-123.45.67" → "04141234567", "+58 414 1234567" → "04141234567".
 * Does not validate; see `isValidMobilePhone`.
 */
export function normalizeMobilePhone(value: string): string {
  const digits = value.replace(/[\s\-.()]/g, "");
  if (digits.startsWith("+58")) return `0${digits.slice(3)}`;
  if (digits.startsWith("58") && digits.length === 12) return `0${digits.slice(2)}`;
  return digits;
}

/** 11 digits starting with a prefix of `MOBILE_PHONE_PREFIXES` (already normalized). */
export function isValidMobilePhone(value: string): boolean {
  return PHONE_PATTERN.test(value);
}

/**
 * The cédula/RIF as the banks want it: letter + digits, uppercase, no dots, dashes or spaces.
 * "v-12.345.678" → "V12345678", "J-40123456-7" → "J401234567". Does not validate; see
 * `isValidIdDocument`.
 */
export function normalizeIdDocument(value: string): string {
  return value.replace(/[\s\-.]/g, "").toUpperCase();
}

/** A letter of `ID_DOCUMENT_PREFIXES` followed by 5 to 9 digits (already normalized). */
export function isValidIdDocument(value: string): boolean {
  return ID_DOCUMENT_PATTERN.test(value);
}

/**
 * A Bs amount the way the bank apps read it: 2 decimals (half-up), comma as decimal separator,
 * no thousands separator. "1234.555" → "1234,56", "1500" → "1500,00".
 * @throws {InvalidValueError} if the amount is not greater than 0.
 * @throws {TypeError} if it is not a decimal number.
 */
export function formatMobilePaymentAmount(amountBs: string): string {
  const amount = toDecimal(amountBs, "amountBs").toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  if (amount.lte(0)) throw new InvalidValueError("amountBs", "must be greater than 0");
  return amount.toFixed(2).replace(".", ",");
}

export type MobilePaymentClipboardInput = {
  bankCode: string;
  phone: string;
  idDocument: string;
  /** Bs to pay, as a decimal string with "." (any number of decimals). */
  amountBs: string;
};

/**
 * Plain text for the banks' "Pegar datos": bank code, phone, cédula/RIF and amount, one per
 * line ("0102\n04141234567\nV12345678\n1234,56"). The single place to change if a bank reads
 * it differently. Phone and cédula are normalized first.
 * @throws {InvalidValueError} for an unknown bank, an invalid phone or cédula, or an amount ≤ 0.
 */
export function formatPagoMovilClipboard(input: MobilePaymentClipboardInput): string {
  const phone = normalizeMobilePhone(input.phone);
  const idDocument = normalizeIdDocument(input.idDocument);
  if (!isValidBankCode(input.bankCode)) {
    throw new InvalidValueError("bankCode", `unknown bank "${input.bankCode}"`);
  }
  if (!isValidMobilePhone(phone)) throw new InvalidValueError("phone", `invalid "${phone}"`);
  if (!isValidIdDocument(idDocument)) {
    throw new InvalidValueError("idDocument", `invalid "${idDocument}"`);
  }
  return [input.bankCode, phone, idDocument, formatMobilePaymentAmount(input.amountBs)].join("\n");
}
