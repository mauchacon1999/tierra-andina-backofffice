/*
 * Validation messages (CLAUDE.md §5: user-facing text is Spanish, but never hard-coded in the
 * schemas). Schemas emit a message token, a catalog key plus optional parameters:
 *
 *   "decimal.positive|subject=rate"  →  "La tasa debe ser mayor que 0"
 *
 * The web formats tokens with the catalog it gets from next-intl (`validation` namespace) and
 * the API formats them with VALIDATION_MESSAGES_ES_VE before answering, so both show the same
 * text. Parameters are plain `{name}` placeholders; `subject` names an entry of `subjects`.
 */

export const VALIDATION_MESSAGES_ES_VE = {
  subjects: {
    amount: "El monto",
    rate: "La tasa",
    packQuantity: "La cantidad por bulto",
    shrinkage: "La merma",
    margin: "El margen",
    packs: "La cantidad de bultos",
    grossQuantity: "La cantidad bruta",
    price: "El precio",
    usdRoundingStep: "El redondeo en dólares",
    bsRoundingStep: "El redondeo en bolívares",
    saleRateMarkupPct: "El recargo de la tasa de venta",
    defaultMargin: "El margen por defecto",
    receivedPacks: "Lo recibido",
    receivedQuantity: "El peso recibido",
    quantity: "La cantidad",
  },
  decimal: {
    notText: "{subject} debe enviarse como texto",
    format: "{subject} debe ser un número con punto decimal (p. ej. 15.50)",
    negative: "{subject} no puede ser menor que 0",
    maxDecimals: "{subject} admite como máximo {max} decimales",
    maxIntegerDigits: "{subject} admite como máximo {max} dígitos enteros",
    positive: "{subject} debe ser mayor que 0",
  },
  auth: {
    emailRequired: "Escribe tu correo",
    emailInvalid: "El correo no es válido",
    passwordRequired: "Escribe tu contraseña",
  },
  name: {
    required: "Escribe el nombre",
    tooShort: "El nombre debe tener al menos {min} caracteres",
    tooLong: "El nombre admite como máximo {max} caracteres",
  },
  text: {
    tooLong: "Máximo {max} caracteres",
  },
  noChanges: "No hay cambios que guardar",
  date: {
    required: "Indica la fecha",
    invalid: "La fecha no es válida (AAAA-MM-DD)",
    rangeOrder: "La fecha inicial debe ser anterior a la final",
    rangeTooLong: "El rango admite como máximo {max} días",
  },
  rates: {
    atLeastOne: "Escribe al menos una tasa",
  },
  settings: {
    defaultMarginRange: "El margen por defecto debe estar entre 0 % y 500 %",
  },
  product: {
    purchaseUnitRequired: "Elige cómo se compra",
    saleUnitRequired: "Elige cómo se vende",
    categoryRequired: "Elige una categoría",
    INVALID_UNIT_COMBINATION: "Lo que se compra por kilo solo se puede vender por kilo",
    PACK_QUANTITY_REQUIRED: "Indica cuánto trae cada bulto",
    PACK_QUANTITY_NOT_ALLOWED: "Los productos por kilo no llevan cantidad por bulto",
    PACK_QUANTITY_NOT_POSITIVE: "La cantidad por bulto debe ser mayor que 0",
    SHRINKAGE_NEGATIVE: "La merma no puede ser negativa",
    SHRINKAGE_NOT_BELOW_PACK: "La merma debe ser menor que la cantidad por bulto",
    MARGIN_OUT_OF_RANGE: "El margen debe estar entre 0 % y 500 %",
  },
  purchase: {
    productRequired: "Elige un producto",
    shrinkageBelowGross: "La merma debe ser menor que la cantidad bruta",
  },
  user: {
    roleRequired: "Elige el rol",
    passwordTooShort: "La contraseña debe tener al menos {min} caracteres",
    passwordTooLong: "La contraseña admite como máximo {max} caracteres",
  },
  dailyClose: {
    customerRequired: "Elige un cliente o escribe su nombre",
    conceptRequired: "Escribe en qué se gastó",
    duplicatePayment: "Cada forma de pago va una sola vez",
  },
  task: {
    assigneeRequired: "Elige a quién se le asigna",
  },
  payable: {
    supplierRequired: "Elige el proveedor",
    linesRequired: "Agrega al menos una línea",
    tooManyLines: "Una factura admite como máximo {max} líneas",
    descriptionRequired: "Escribe qué se compró",
    categoryRequired: "Elige la categoría del gasto",
    dueBeforeIssue: "El vencimiento no puede ser antes de la emisión",
    methodRequired: "Elige cómo se pagó",
  },
  mobilePayment: {
    bankInvalid: "Elige un banco de la lista",
    phoneInvalid:
      "El teléfono debe tener 11 dígitos y empezar por 0412, 0414, 0416, 0422, 0424 o 0426",
    idDocumentInvalid: "Escribe la cédula o RIF con su letra (V, E, J, G o P) y sin puntos",
  },
  receipt: {
    receivedPacksRange: "Debe ser más de 0 y menos de lo comprado",
    receivedQuantityRange: "Debe ser más de 0 y no más de lo comprado",
  },
} as const;

/** Shape every locale's catalog must have (same keys as es-VE). */
export type ValidationMessages = {
  [
    Group in keyof typeof VALIDATION_MESSAGES_ES_VE
  ]: (typeof VALIDATION_MESSAGES_ES_VE)[Group] extends string
    ? string
    : { [Key in keyof (typeof VALIDATION_MESSAGES_ES_VE)[Group]]: string };
};

type Catalog = typeof VALIDATION_MESSAGES_ES_VE;

/** "decimal.positive", "noChanges"… every message key except the subjects. */
export type ValidationMessageKey = {
  [Group in Exclude<keyof Catalog, "subjects">]: Catalog[Group] extends string
    ? Group
    : `${Group}.${Extract<keyof Catalog[Group], string>}`;
}[Exclude<keyof Catalog, "subjects">];

export type ValidationSubject = keyof Catalog["subjects"];

export type ValidationParams = { subject?: ValidationSubject } & Record<string, string | number>;

const SEPARATOR = "|";

/** Builds a message token: `message("decimal.positive", { subject: "rate" })`. */
export function message(key: ValidationMessageKey, params?: ValidationParams): string {
  if (!params) return key;
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) search.set(name, String(value));
  return `${key}${SEPARATOR}${search.toString()}`;
}

function lookup(catalog: ValidationMessages, path: string): string | undefined {
  const [group, key] = path.split(".");
  const entry = (catalog as Record<string, unknown>)[group ?? ""];
  if (typeof entry === "string") return key === undefined ? entry : undefined;
  if (entry && typeof entry === "object" && key !== undefined) {
    const text = (entry as Record<string, unknown>)[key];
    return typeof text === "string" ? text : undefined;
  }
  return undefined;
}

/**
 * Turns a message token into text with the given catalog (Spanish by default). Text that is not
 * a known token (e.g. a message that is already human-readable) is returned unchanged.
 */
export function formatValidationMessage(
  token: string,
  catalog: ValidationMessages = VALIDATION_MESSAGES_ES_VE,
): string {
  const [key = "", query] = token.split(SEPARATOR, 2);
  const template = lookup(catalog, key);
  if (template === undefined || key.startsWith("subjects.")) return token;
  const params = new URLSearchParams(query ?? "");
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params.get(name);
    if (value === null) return placeholder;
    return name === "subject" ? (lookup(catalog, `subjects.${value}`) ?? value) : value;
  });
}
