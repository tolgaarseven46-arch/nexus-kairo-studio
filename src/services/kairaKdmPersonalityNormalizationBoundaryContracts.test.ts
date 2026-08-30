import { describe, expect, it } from 'vitest';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';

describe('KDM personality normalization boundary', () => {
  it('keeps direct KDM state math finite for non-finite personality input', () => {
    const result = analyzeKdmInteraction('normal mesaj', { patience: Number.NaN, empathy: Number.POSITIVE_INFINITY, anger: Number.NaN, loyalty: Number.NEGATIVE_INFINITY });
    expect(Number.isFinite(result.nextDynamicState.stress)).toBe(true);
    expect(Number.isFinite(result.nextDynamicState.happiness)).toBe(true);
    expect(Number.isFinite(result.nextDynamicState.anger)).toBe(true);
    expect(Number.isFinite(result.trace.relationship.toleranceMultiplier)).toBe(true);
  });

  it('clamps direct out-of-range personality before KDM relationship math', () => {
    const result = analyzeKdmInteraction('salaksın', { patience: -100, empathy: 200, anger: 200, emotionalSensitivity: 200, loyalty: 200 });
    expect(result.behaviorProfile.debugMatrix.inputTraits.patience).toBe(0);
    expect(result.behaviorProfile.debugMatrix.inputTraits.empathy).toBe(100);
    expect(result.behaviorProfile.debugMatrix.inputTraits.anger).toBe(100);
    expect(Number.isFinite(result.trace.relationship.toleranceMultiplier)).toBe(true);
  });
});
