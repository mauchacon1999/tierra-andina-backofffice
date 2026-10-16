// @ta/core: pure business logic (pure functions with tests, no I/O).
export { normalizeDecimal, sum } from "./decimal";
export { DomainError, InvalidValueError, ShrinkageExceedsQuantityError } from "./errors";
export { roundUpToStep } from "./rounding";
export { MAX_MARGIN, priceInBs, priceLine } from "./pricing";
export type { LinePricing, LinePricingInput } from "./pricing";
export {
  allowedSaleUnits,
  assertValidProduct,
  cleanProductName,
  fractionToPercent,
  InvalidProductDefaultsError,
  InvalidUnitCombinationError,
  isValidUnitCombination,
  normalizeProductName,
  percentToFraction,
  PURCHASE_UNITS,
  requiresPackQuantity,
  SALE_UNITS,
  validateProductDefaults,
} from "./products";
export type {
  ProductDefaultsInput,
  ProductDefaultsIssue,
  ProductDefaultsIssueCode,
  PurchaseUnit,
  SaleUnit,
} from "./products";
export { amountInBs, sumDecimals } from "./rates";
export { BUSINESS_TIME_ZONE, isBusinessDate, toBusinessDate } from "./business-date";
