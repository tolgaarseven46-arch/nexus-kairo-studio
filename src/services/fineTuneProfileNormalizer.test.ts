import { describe, expect, it } from 'vitest';
import { normalizeFineTuneProfile } from './fineTuneProfileNormalizer';

describe('fine-tune profile normalization boundary', () => {
  it('keeps finite values and clamps them to the 0..100 contract', () => {
    expect(normalizeFineTuneProfile({ a: 150, b: -20, c: 42.5 })).toEqual({ a: 100, b: 0, c: 42.5 });
  });

  it('drops non-numeric and non-finite persisted values', () => {
    expect(normalizeFineTuneProfile({ good: 80, bad: '80', nan: Number.NaN, inf: Number.POSITIVE_INFINITY, nil: null })).toEqual({ good: 80 });
  });

  it('keeps the persisted legacy deciveness key unchanged for compatibility', () => {
    expect(normalizeFineTuneProfile({ 'personality.cognition.deciveness': 68 })).toEqual({ 'personality.cognition.deciveness': 68 });
  });
});
