import { describe, expect, it } from 'vitest';
import { computeBehaviorProfile } from './droitBehaviorEngine';

describe('behavior empathy summary normalized threshold', () => {
  it('marks high empathy at the normalized 0.75 boundary', () => {
    const profile = computeBehaviorProfile({ empathy: 75, humor: 0, selfConfidence: 50, authority: 50, patience: 50, anger: 50, curiosity: 50, analyticalThinking: 50, creativity: 50, decisionMaking: 50, attention: 50, seriousness: 50 }, 'normal mesaj');
    expect(profile.empathyLevel).toBe(0.75);
    expect(profile.dominantSummary).toContain('Yüksek Empati');
  });

  it('does not mark empathy below the boundary', () => {
    const profile = computeBehaviorProfile({ empathy: 74, humor: 0, selfConfidence: 50, authority: 50, patience: 50, anger: 50, curiosity: 50, analyticalThinking: 50, creativity: 50, decisionMaking: 50, attention: 50, seriousness: 50 }, 'normal mesaj');
    expect(profile.empathyLevel).toBe(0.74);
    expect(profile.dominantSummary).not.toContain('Yüksek Empati');
  });
});
