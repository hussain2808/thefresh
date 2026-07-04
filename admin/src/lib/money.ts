// Mirrors api/src/common/types/money.ts — fils are always integers, AED is a display-only conversion.
export function toAed(fils: number): number {
  return fils / 100;
}

export function toFils(aed: number): number {
  return Math.round(aed * 100);
}

export function formatAed(fils: number): string {
  return `AED ${toAed(fils).toFixed(2)}`;
}
