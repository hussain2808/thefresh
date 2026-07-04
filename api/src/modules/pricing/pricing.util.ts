import { Fils } from '../../common/types/money';
import { Grams } from '../../common/types/weight';

export interface EstimatedPriceInput {
  basePriceFils: Fils;
  weightGrams: Grams;
  modifierPercent: number; // signed, e.g. +5 / -5
  prepChargeFils?: Fils;
}

/**
 * Integer-only: rounds once, after applying the weight modifier, to avoid
 * compounding rounding error across the weight and percent divisions.
 */
export function computeEstimatedPrice(input: EstimatedPriceInput): Fils {
  const { basePriceFils, weightGrams, modifierPercent, prepChargeFils = 0 } = input;

  const weightedPrice = (basePriceFils * weightGrams * (100 + modifierPercent)) / (1000 * 100);

  return Math.round(weightedPrice) + prepChargeFils;
}
