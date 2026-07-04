import { Grams } from '../../../common/types/weight';

export interface WeightOptionLike {
  id: string;
  weightGrams: number;
  modifierPercent: number;
}

export function selectWeightOption<T extends WeightOptionLike>(options: T[], weightGrams: Grams): T {
  const match = options.find((option) => option.weightGrams === weightGrams);
  if (!match) {
    throw new Error(`No weight option found for ${weightGrams}g`);
  }
  return match;
}
