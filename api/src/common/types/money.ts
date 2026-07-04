/**
 * All money in this codebase is stored and calculated as integer fils
 * (1 AED = 100 fils). Never use floats for money — rounding errors
 * compound across weight modifiers, prep charges, and tax.
 *
 * Convert to/from display AED only at the API edge (DTOs / serializers).
 */
export type Fils = number; // integer

export function toFils(aed: number): Fils {
  return Math.round(aed * 100);
}

export function toAed(fils: Fils): number {
  return fils / 100;
}
