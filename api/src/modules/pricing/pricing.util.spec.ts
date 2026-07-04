import { computeEstimatedPrice } from './pricing.util';

describe('computeEstimatedPrice', () => {
  it('computes price at exactly 1kg with no modifier', () => {
    expect(
      computeEstimatedPrice({ basePriceFils: 10000, weightGrams: 1000, modifierPercent: 0 }),
    ).toBe(10000);
  });

  it('applies a positive modifier for a smaller weight breakpoint', () => {
    // 500g at 10000 fils/kg would normally be 5000 fils; +5% modifier -> 5250
    expect(
      computeEstimatedPrice({ basePriceFils: 10000, weightGrams: 500, modifierPercent: 5 }),
    ).toBe(5250);
  });

  it('applies a negative modifier for a larger weight breakpoint', () => {
    // 2kg at 10000 fils/kg would normally be 20000 fils; -5% modifier -> 19000
    expect(
      computeEstimatedPrice({ basePriceFils: 10000, weightGrams: 2000, modifierPercent: -5 }),
    ).toBe(19000);
  });

  it('adds the preparation charge after the weight modifier is applied', () => {
    expect(
      computeEstimatedPrice({
        basePriceFils: 10000,
        weightGrams: 1000,
        modifierPercent: 0,
        prepChargeFils: 1500,
      }),
    ).toBe(11500);
  });

  it('defaults the preparation charge to zero when omitted', () => {
    expect(
      computeEstimatedPrice({ basePriceFils: 10000, weightGrams: 1000, modifierPercent: 0 }),
    ).toBe(10000);
  });

  it('rounds a fractional fils amount up at exactly .5', () => {
    // 1 fils/kg at 500g with no modifier = 0.5 fils
    expect(computeEstimatedPrice({ basePriceFils: 1, weightGrams: 500, modifierPercent: 0 })).toBe(1);
  });

  it('rounds a non-half fractional fils amount to the nearest integer', () => {
    // 333 fils/kg at 750g = 249.75 fils -> rounds to 250
    expect(
      computeEstimatedPrice({ basePriceFils: 333, weightGrams: 750, modifierPercent: 0 }),
    ).toBe(250);
  });

  it('rounds only once, after combining the weight and modifier math', () => {
    // 777 fils/kg at 333g with a +7% modifier: exercises non-round intermediate values
    // raw = 777 * 333 * 107 / 100000 = 277.129... -> rounds to 277
    expect(
      computeEstimatedPrice({ basePriceFils: 777, weightGrams: 333, modifierPercent: 7 }),
    ).toBe(277);
  });

  it('handles a zero base price', () => {
    expect(
      computeEstimatedPrice({ basePriceFils: 0, weightGrams: 1000, modifierPercent: 10, prepChargeFils: 500 }),
    ).toBe(500);
  });
});
