// @ta/core: pure business logic (pure functions with tests, no I/O).
export { compareDecimals, normalizeDecimal, sum } from "./decimal";
export { DomainError, InvalidValueError, ShrinkageExceedsQuantityError } from "./errors";
export { roundUpToStep } from "./rounding";
export { MAX_MARGIN, priceInBs, priceLine, proposeSaleRateList } from "./pricing";
export type { LinePricing, LinePricingInput, ProposedShelfPrice, ShelfPrice } from "./pricing";
export {
  allowedSaleUnits,
  assertValidProduct,
  cleanProductName,
  estimateGrossQuantity,
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
export {
  BUSINESS_TIME_ZONE,
  isBusinessDate,
  toBusinessDate,
  weekContaining,
} from "./business-date";
export { InvalidReceiptError, pricePartialReceipt } from "./receipt";
export { CURRENCIES, dailyCloseTotals, subtractTotals, totalsByCurrency } from "./daily-close";
export type {
  CurrencyAmount,
  CurrencyTotals,
  Currency,
  DailyCloseTotals,
  DailyCloseTotalsInput,
} from "./daily-close";
export type { PartialReceiptInput, PartialReceiptPricing } from "./receipt";
