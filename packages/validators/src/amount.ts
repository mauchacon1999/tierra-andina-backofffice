import { z } from "zod";

// numeric(14, 4) columns: 14 digits in total, 4 decimals → at most 10 integer digits.
const MAX_DECIMALS = 4;
const MAX_INTEGER_DIGITS = 10;

/**
 * Amount as a numeric string: "." as decimal separator, up to 4 decimals, >= 0, and small enough
 * to fit numeric(14,4). Valid: "0", "15", "15.5", "1234.5678". Invalid: "-1", "1.23456", "1,5", "1e3".
 * Messages are in Spanish because they are shown to users.
 */
export const amountSchema = z
  .string({ error: "El monto debe enviarse como texto" })
  .regex(/^-?\d+(\.\d+)?$/, {
    message: "El monto debe ser un número con punto decimal (p. ej. 15.50)",
    abort: true,
  })
  .refine((v) => !v.startsWith("-"), { message: "El monto no puede ser negativo", abort: true })
  .refine((v) => (v.split(".")[1]?.length ?? 0) <= MAX_DECIMALS, {
    message: `El monto admite como máximo ${MAX_DECIMALS} decimales`,
  })
  .refine((v) => (v.split(".")[0]?.length ?? 0) <= MAX_INTEGER_DIGITS, {
    message: `El monto admite como máximo ${MAX_INTEGER_DIGITS} dígitos enteros`,
  });

export type Amount = z.infer<typeof amountSchema>;
