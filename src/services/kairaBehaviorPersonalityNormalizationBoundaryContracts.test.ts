import { describe, expect, it } from 'vitest';
import { computeBehaviorProfile } from './droitBehaviorEngine';

describe('behavior personality normalization boundary', () => {
  it('clamps direct out-of-range personality values before behavior synthesis', () => {
    const profile = computeBehaviorProfile({ empathy: 150, humor: -20, anger: 200, patience: -5 }, 'normal mesaj');
    expect(profile.empathyLevel).toBe(1);
    expect(profile.humorLevel).toBe(0);
    expect(profile.temperLevel).toBe(1);
    expect(profile.patienceLevel).toBe(0);
  });

  it('replaces non-finite direct values with canonical neutral defaults', () => {
    const profile = computeBehaviorProfile({ empathy: Number.NaN, humor: Number.POSITIVE_INFINITY }, 'normal mesaj');
    expect(profile.empathyLevel).toBe(0.5);
    expect(profile.humorLevel).toBe(0.5);
  });
});
