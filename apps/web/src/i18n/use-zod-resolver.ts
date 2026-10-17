"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { formatValidationMessage, type ValidationMessages } from "@ta/validators";
import { useMessages } from "next-intl";
import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

/** Replaces every validation token in RHF's error tree with its text in `catalog`. */
export function translateFieldErrors<T extends FieldValues>(
  errors: FieldErrors<T>,
  catalog: ValidationMessages,
): FieldErrors<T> {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      // `ref` is the DOM element: keep it as is.
      if (key === "ref") out[key] = value;
      else if (key === "message" && typeof value === "string")
        out[key] = formatValidationMessage(value, catalog);
      else out[key] = walk(value);
    }
    return out;
  };
  return walk(errors) as FieldErrors<T>;
}

/**
 * `zodResolver` that shows validation messages in the user's language: the shared schemas emit
 * message tokens (@ta/validators messages.ts) and this formats them with the `validation`
 * messages of next-intl. Use it in every form instead of `zodResolver`.
 */
export function useZodResolver<Input extends FieldValues, Output>(
  schema: z.ZodType<Output, Input>,
): Resolver<Input, unknown, Output> {
  const catalog = useMessages().validation;
  const resolve: Resolver<Input, unknown, Output> = zodResolver(schema);
  return async (values, context, options) => {
    const result = await resolve(values, context, options);
    if (Object.keys(result.errors).length === 0) return result;
    const errors: FieldErrors<Input> = result.errors;
    return { values: {}, errors: translateFieldErrors(errors, catalog) };
  };
}
