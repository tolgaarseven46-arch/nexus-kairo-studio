import { describe, expect, it } from 'vitest';
import { computeMotivationResponse, motivationsFromFineTune } from './motivationEngine';

const recognitionSituation = {
  socialOpportunity: 0.2,
  rejectionRisk: 0.1,
  recognitionOpportunity: 0.9,
  autonomyThreat: 0.1,
  achievementOpportunity: 0.2,
  influenceOpportunity: 0.2,
  uncertainty: 0.2,
  instability: 0.1,
};

describe('recognition motivation downstream wiring', () => {
  it('maps the CharacterTab recognition key into the stable motivation profile', () => {
    expect(motivationsFromFineTune({ 'motivation.social.recognition': 87 }).recognition).toBe(87);
  });

  it('makes recognition need change downstream approach only when recognition is contextually available', () => {
    const low = computeMotivationResponse({ ...motivationsFromFineTune({}), recognition: 10 }, recognitionSituation);
    const high = computeMotivationResponse({ ...motivationsFromFineTune({}), recognition: 90 }, recognitionSituation);
    expect(high.drives.approvalDrive).toBeGreaterThan(low.drives.approvalDrive);
    expect(high.drives.approachPressure).toBeGreaterThan(low.drives.approachPressure);
  });

  it('does not let recognition need create meaningful approach pressure without recognition opportunity', () => {
    const noOpportunity = { ...recognitionSituation, recognitionOpportunity: 0 };
    const low = computeMotivationResponse({ ...motivationsFromFineTune({}), recognition: 10 }, noOpportunity);
    const high = computeMotivationResponse({ ...motivationsFromFineTune({}), recognition: 90 }, noOpportunity);
    expect(high.drives.approachPressure).toBeCloseTo(low.drives.approachPressure, 6);
  });
});
