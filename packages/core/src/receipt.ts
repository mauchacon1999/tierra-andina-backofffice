import { toDbString, toDecimal } from "./decimal";
import { DomainError } from "./errors";
import { priceLine, type LinePricingInput } from "./pricing";

/*
 * Truck receipt (docs/domain-model.md §4). A partial receipt does not change what was paid:
 * the same real cost is spread over what arrived, so the unit cost and sale price go up.
 */

/** Packs received outside 0 < received < bought, or a received quantity outside 0 < q ≤ gross. */
export class InvalidReceiptError extends DomainError {
  constructor(
    readonly field: "receivedPacks" | "receivedQuantity",
    message: string,
  ) {
    super("INVALID_RECEIPT", `${field}: ${message}`);
  }
}

export type PartialReceiptInput = LinePricingInput & {
  /** Packs bought (crates, bundles or kilos). */
  packs: string;
  /** Packs that arrived: more than 0 and fewer than bought. */
  receivedPacks: string;
  /**
   * Weighed/counted quantity that arrived, in the sale unit. Optional: by default the same
   * share of the gross quantity as the packs (2 of 3 crates of 72 kg → 48 kg).
   */
  receivedQuantity?: string | undefined;
};

export type PartialReceiptPricing = {
  receivedQuantity: string;
  /** received quantity − the same share of the shrinkage. */
  receivedUsableQuantity: string;
  receivedUnitCostUsd: string;
  receivedSalePriceUsd: string;
};

/**
 * Cost of a partially received line:
 *
 *   received_quantity        = given, or gross_quantity × received_packs / packs
 *   received_shrinkage       = shrinkage × received_quantity / gross_quantity
 *   received_usable_quantity = received_quantity − received_shrinkage
 *   received_unit_cost_usd   = real_cost_usd / received_usable_quantity
 *   received_sale_price_usd  = round_up(unit × (1 + margin), usd_rounding_step)
 *
 * The real cost is the purchase's (what was paid). Quantities and costs are rounded half-up to
 * 4 decimals like `priceLine`. Results are 4-decimal strings.
 * @throws {InvalidReceiptError} received packs not in (0, packs), or received quantity not in
 *   (0, gross quantity].
 * @throws the errors of `priceLine` for invalid purchase values.
 */
export function pricePartialReceipt(input: PartialReceiptInput): PartialReceiptPricing {
  const packs = toDecimal(input.packs, "packs");
  const receivedPacks = toDecimal(input.receivedPacks, "receivedPacks");
  if (receivedPacks.lte(0) || receivedPacks.gte(packs)) {
    throw new InvalidReceiptError("receivedPacks", "must be more than 0 and fewer than bought");
  }
  const gross = toDecimal(input.grossQuantity, "grossQuantity");
  const received =
    input.receivedQuantity === undefined
      ? toDecimal(toDbString(gross.times(receivedPacks).div(packs)), "receivedQuantity")
      : toDecimal(input.receivedQuantity, "receivedQuantity");
  if (received.lte(0) || received.gt(gross)) {
    throw new InvalidReceiptError("receivedQuantity", "must be more than 0 and at most the gross");
  }
  const shrinkage = toDbString(toDecimal(input.shrinkage, "shrinkage").times(received).div(gross));
  const pricing = priceLine({ ...input, grossQuantity: received.toFixed(), shrinkage });

  return {
    receivedQuantity: toDbString(received),
    receivedUsableQuantity: pricing.usableQuantity,
    receivedUnitCostUsd: pricing.unitCostUsd,
    receivedSalePriceUsd: pricing.salePriceUsd,
  };
}
