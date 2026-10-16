import { z } from "zod";

/** Columnas numeric(14, 4): 14 dígitos en total, 4 decimales → máximo 10 enteros. */
const MAX_DECIMALES = 4;
const MAX_ENTEROS = 10;

/**
 * Monto como string numérico: punto decimal, hasta 4 decimales, >= 0 y que quepa en numeric(14,4).
 * Ejemplos válidos: "0", "15", "15.5", "1234.5678". Inválidos: "-1", "1.23456", "1,5", "1e3".
 */
export const montoSchema = z
  .string({ error: "El monto debe enviarse como texto" })
  .regex(/^-?\d+(\.\d+)?$/, {
    message: "El monto debe ser un número con punto decimal (p. ej. 15.50)",
    abort: true,
  })
  .refine((v) => !v.startsWith("-"), { message: "El monto no puede ser negativo", abort: true })
  .refine((v) => (v.split(".")[1]?.length ?? 0) <= MAX_DECIMALES, {
    message: `El monto admite como máximo ${MAX_DECIMALES} decimales`,
  })
  .refine((v) => (v.split(".")[0]?.length ?? 0) <= MAX_ENTEROS, {
    message: `El monto admite como máximo ${MAX_ENTEROS} dígitos enteros`,
  });

export type Monto = z.infer<typeof montoSchema>;
