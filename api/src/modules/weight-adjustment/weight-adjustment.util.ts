import { computeEstimatedPrice } from '../pricing/pricing.util';
import { Fils } from '../../common/types/money';
import { Grams } from '../../common/types/weight';

/**
 * Signed variance in basis points (% × 100) — integer, same convention as
 * money/weight fields, so this never needs a Decimal column.
 */
export function computeVarianceBasisPoints(requestedGrams: Grams, actualGrams: Grams): number {
  return Math.round(((actualGrams - requestedGrams) / requestedGrams) * 10000);
}

export interface AdjustLineInput {
  lineId: string;
  requestedWeightGrams: Grams;
  actualWeightGrams: Grams;
  basePriceFils: Fils;
  modifierPercent: number;
  prepChargeFils: Fils;
}

export interface AdjustLineResult {
  lineId: string;
  finalPriceFils: Fils;
  varianceBasisPoints: number;
}

/**
 * Recomputes a line's final price from its actual weight, reusing the same
 * pure pricing formula (computeEstimatedPrice) the estimate was built with —
 * the Weight Adjustment Engine never reimplements price math of its own.
 */
export function adjustLine(input: AdjustLineInput): AdjustLineResult {
  const finalPriceFils = computeEstimatedPrice({
    basePriceFils: input.basePriceFils,
    weightGrams: input.actualWeightGrams,
    modifierPercent: input.modifierPercent,
    prepChargeFils: input.prepChargeFils,
  });

  return {
    lineId: input.lineId,
    finalPriceFils,
    varianceBasisPoints: computeVarianceBasisPoints(input.requestedWeightGrams, input.actualWeightGrams),
  };
}
