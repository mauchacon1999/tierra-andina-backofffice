import { z } from "zod";

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
 * `subject` starts the Spanish messages shown to users: "El monto", "La cantidad", "La merma".
 */
export function decimalSchema(
  subject: string,
  { maxDecimals = DB_DECIMALS }: DecimalSchemaOptions = {},
): z.ZodString {
  return z
    .string({ error: `${subject} debe enviarse como texto` })
    .regex(/^-?\d+(\.\d+)?$/, {
      message: `${subject} debe ser un número con punto decimal (p. ej. 15.50)`,
      abort: true,
    })
    .refine((v) => !v.startsWith("-"), {
      message: `${subject} no puede ser menor que 0`,
      abort: true,
    })
    .refine((v) => (v.split(".")[1]?.length ?? 0) <= maxDecimals, {
      message: `${subject} admite como máximo ${maxDecimals} decimales`,
    })
    .refine((v) => (v.split(".")[0]?.length ?? 0) <= MAX_INTEGER_DIGITS, {
      message: `${subject} admite como máximo ${MAX_INTEGER_DIGITS} dígitos enteros`,
    });
}

/** Money amount (USD or Bs). See `decimalSchema`. */
export const amountSchema = decimalSchema("El monto");

export type Amount = z.infer<typeof amountSchema>;
