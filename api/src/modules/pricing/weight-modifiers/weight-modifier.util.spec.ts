import { selectWeightOption, WeightOptionLike } from './weight-modifier.util';

describe('selectWeightOption', () => {
  const options: WeightOptionLike[] = [
    { id: 'wo-500', weightGrams: 500, modifierPercent: 5 },
    { id: 'wo-1000', weightGrams: 1000, modifierPercent: 0 },
    { id: 'wo-2000', weightGrams: 2000, modifierPercent: -5 },
  ];

  it('selects the matching breakpoint among several', () => {
    expect(selectWeightOption(options, 1000)).toEqual(options[1]);
  });

  it('selects the first breakpoint when it matches', () => {
    expect(selectWeightOption(options, 500)).toEqual(options[0]);
  });

  it('selects the last breakpoint when it matches', () => {
    expect(selectWeightOption(options, 2000)).toEqual(options[2]);
  });

  it('throws when no breakpoint matches the requested weight', () => {
    expect(() => selectWeightOption(options, 750)).toThrow('No weight option found for 750g');
  });

  it('throws when the options list is empty', () => {
    expect(() => selectWeightOption([], 500)).toThrow('No weight option found for 500g');
  });
});
