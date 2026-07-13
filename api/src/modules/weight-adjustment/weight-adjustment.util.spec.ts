import { adjustLine, computeVarianceBasisPoints } from './weight-adjustment.util';

describe('computeVarianceBasisPoints', () => {
  it('returns zero when actual weight matches requested weight exactly', () => {
    expect(computeVarianceBasisPoints(1000, 1000)).toBe(0);
  });

  it('returns a positive value when actual weight is over requested', () => {
    // (1100 - 1000) / 1000 = 10% -> 1000 basis points
    expect(computeVarianceBasisPoints(1000, 1100)).toBe(1000);
  });

  it('returns a negative value when actual weight is under requested', () => {
    // (900 - 1000) / 1000 = -10% -> -1000 basis points
    expect(computeVarianceBasisPoints(1000, 900)).toBe(-1000);
  });

  it('rounds to the nearest basis point', () => {
    // (1001 - 1000) / 1000 = 0.1% -> 10 basis points, exact
    expect(computeVarianceBasisPoints(1000, 1001)).toBe(10);
    // (1003 - 1000) / 1000 = 0.3% -> 30 basis points
    expect(computeVarianceBasisPoints(1000, 1003)).toBe(30);
  });
});

describe('adjustLine', () => {
  it('recomputes the final price from actual weight using the same pricing formula as the estimate', () => {
    // 10000 fils/kg, no modifier: 1.1kg actual -> 11000 fils
    const result = adjustLine({
      lineId: 'l1',
      requestedWeightGrams: 1000,
      actualWeightGrams: 1100,
      basePriceFils: 10000,
      modifierPercent: 0,
      prepChargeFils: 0,
    });
    expect(result.finalPriceFils).toBe(11000);
    expect(result.varianceBasisPoints).toBe(1000);
  });

  it('applies the locked-in weight-tier modifier and prep charge, not just the actual weight', () => {
    // 10000 fils/kg, +5% modifier (locked from the 500g breakpoint chosen at
    // checkout), prep charge 1500, actual weight comes in at 520g:
    // (10000 * 520 * 105) / 100000 = 5460 -> + 1500 = 6960
    const result = adjustLine({
      lineId: 'l2',
      requestedWeightGrams: 500,
      actualWeightGrams: 520,
      basePriceFils: 10000,
      modifierPercent: 5,
      prepChargeFils: 1500,
    });
    expect(result.finalPriceFils).toBe(6960);
    expect(result.varianceBasisPoints).toBe(400); // (520-500)/500 = 4% -> 400 bps
  });

  it('produces a negative variance and a lower final price when underweight', () => {
    const result = adjustLine({
      lineId: 'l3',
      requestedWeightGrams: 2000,
      actualWeightGrams: 1900,
      basePriceFils: 5000,
      modifierPercent: -5,
      prepChargeFils: 0,
    });
    // (5000 * 1900 * 95) / 100000 = 9025
    expect(result.finalPriceFils).toBe(9025);
    expect(result.varianceBasisPoints).toBe(-500);
  });

  it('preserves the lineId on the result', () => {
    const result = adjustLine({
      lineId: 'line-abc',
      requestedWeightGrams: 1000,
      actualWeightGrams: 1000,
      basePriceFils: 1000,
      modifierPercent: 0,
      prepChargeFils: 0,
    });
    expect(result.lineId).toBe('line-abc');
  });
});
