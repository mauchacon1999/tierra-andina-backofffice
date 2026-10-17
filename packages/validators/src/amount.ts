import { z } from "zod";

import { message, type ValidationSubject } from "./messages";

// numeric(14, 4) columns: 14 digits in total, 4 decimals → at most 10 integer digits.
const DB_DECIMALS = 4;
const MAX_INTEGER_DIGITS = 10;

export type DecimalSchemaOptions = {
  /** Fewer decimals than the DB allows, e.g. 2 for a percentage that becomes a fraction. */
  maxDecimals?: number;
};

/**
 * Non-negative decimal as a string: "." as separator, up to 4 decimals (or `maxDecimals`), at
 * most 10 integer digits so it fits numeric(14,4). Valid: "0", "15", "15.5", "1234.5678".
 * Invalid: "-1", "1.23456", "1,5", "1e3", " 1".
 * `subject` names what is validated in the messages ("rate" → "La tasa debe…", messages.ts).
 */
export function decimalSchema(
  subject: ValidationSubject,
  { maxDecimals = DB_DECIMALS }: DecimalSchemaOptions = {},
): z.ZodString {
  return z
    .string({ error: message("decimal.notText", { subject }) })
    .regex(/^-?\d+(\.\d+)?$/, {
      message: message("decimal.format", { subject }),
      abort: true,
    })
    .refine((v) => !v.startsWith("-"), {
      message: message("decimal.negative", { subject }),
      abort: true,
    })
    .refine((v) => (v.split(".")[1]?.length ?? 0) <= maxDecimals, {
      message: message("decimal.maxDecimals", { subject, max: maxDecimals }),
    })
    .refine((v) => (v.split(".")[0]?.length ?? 0) <= MAX_INTEGER_DIGITS, {
      message: message("decimal.maxIntegerDigits", { subject, max: MAX_INTEGER_DIGITS }),
    });
}

/** Money amount (USD or Bs). See `decimalSchema`. */
export const amountSchema = decimalSchema("amount");

export type Amount = z.infer<typeof amountSchema>;
