/**
 * Base class for business-rule violations raised by @ta/core. `code` is stable
 * (SCREAMING_SNAKE_CASE) so the API can map it to an error response.
 */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Shrinkage must be ≥ 0 and strictly less than the gross quantity. */
export class ShrinkageExceedsQuantityError extends DomainError {
  constructor(
    readonly shrinkage: string,
    readonly grossQuantity: string,
  ) {
    super(
      "SHRINKAGE_EXCEEDS_QUANTITY",
      `shrinkage (${shrinkage}) must be ≥ 0 and less than the gross quantity (${grossQuantity})`,
    );
  }
}

/** A quantity, price, rate or margin outside its allowed range. */
export class InvalidValueError extends DomainError {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super("INVALID_VALUE", `${field}: ${message}`);
  }
}
