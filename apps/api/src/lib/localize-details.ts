import { formatValidationMessage } from "@ta/validators";

function localizeList(value: unknown): unknown {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? formatValidationMessage(item) : item))
    : value;
}

/**
 * Validation messages travel as tokens (`@ta/validators` messages.ts); the API answers in
 * Spanish, so the `formErrors` and `fieldErrors` of an error's details are formatted here,
 * once, for every module. Other details are returned untouched.
 */
export function localizeDetails(details: unknown): unknown {
  if (!details || typeof details !== "object" || Array.isArray(details)) return details;
  const out: Record<string, unknown> = { ...details };
  if ("formErrors" in out) out.formErrors = localizeList(out.formErrors);
  if (out.fieldErrors && typeof out.fieldErrors === "object") {
    out.fieldErrors = Object.fromEntries(
      Object.entries(out.fieldErrors).map(([field, messages]) => [field, localizeList(messages)]),
    );
  }
  return out;
}
