/**
 * All weight in this codebase is stored and calculated as integer grams.
 * Never use floats for weight — the same reasoning as Money applies,
 * since price is derived directly from weight.
 *
 * Convert to/from display kg only at the API edge (DTOs / serializers).
 */
export type Grams = number; // integer

export function toGrams(kg: number): Grams {
  return Math.round(kg * 1000);
}

export function toKg(grams: Grams): number {
  return grams / 1000;
}
