import { describe, expect, it } from 'vitest';
import { motivationsFromFineTune, computeMotivationResponse, type MotivationProfile, type MotivationSituation } from './motivationEngine';

const neutral: MotivationProfile = { connection: 50, belonging: 50, recognition: 50, autonomy: 50, achievement: 50, impact: 50, predictability: 50, stability: 50 };
const sit = (partial: Partial<MotivationSituation>): MotivationSituation => ({ socialOpportunity: 0, rejectionRisk: 0, recognitionOpportunity: 0, autonomyThreat: 0, achievementOpportunity: 0, influenceOpportunity: 0, uncertainty: 0, instability: 0, ...partial });

describe('motivation downstream coverage', () => {
  it('maps all eight CharacterTab motivation keys', () => {
    expect(motivationsFromFineTune({
      'motivation.social.connection': 61,
      'motivation.social.belonging': 62,
      'motivation.social.recognition': 63,
      'motivation.agency.autonomy': 64,
      'motivation.agency.achievement': 65,
      'motivation.agency.impact': 66,
      'motivation.security.predictability': 67,
      'motivation.security.stability': 68,
    })).toEqual({ connection: 61, belonging: 62, recognition: 63, autonomy: 64, achievement: 65, impact: 66, predictability: 67, stability: 68 });
  });

  it('keeps connection live in social approach and rejection withdrawal', () => {
    const social = sit({ socialOpportunity: 0.9 });
    const low = computeMotivationResponse({ ...neutral, connection: 10 }, social);
    const high = computeMotivationResponse({ ...neutral, connection: 90 }, social);
    expect(high.drives.affiliationDrive).toBeGreaterThan(low.drives.affiliationDrive);
    expect(high.drives.approachPressure).toBeGreaterThan(low.drives.approachPressure);
    const rejection = sit({ rejectionRisk: 0.9 });
    expect(computeMotivationResponse({ ...neutral, connection: 90 }, rejection).drives.withdrawalPressure)
      .toBeGreaterThan(computeMotivationResponse({ ...neutral, connection: 10 }, rejection).drives.withdrawalPressure);
  });

  it('keeps belonging live in social approach and rejection withdrawal', () => {
    const social = sit({ socialOpportunity: 0.9 });
    const low = computeMotivationResponse({ ...neutral, belonging: 10 }, social);
    const high = computeMotivationResponse({ ...neutral, belonging: 90 }, social);
    expect(high.drives.affiliationDrive).toBeGreaterThan(low.drives.affiliationDrive);
    expect(high.drives.approachPressure).toBeGreaterThan(low.drives.approachPressure);
  });

  it('keeps recognition live only when recognition opportunity exists', () => {
    const active = sit({ recognitionOpportunity: 0.9 });
    const low = computeMotivationResponse({ ...neutral, recognition: 10 }, active);
    const high = computeMotivationResponse({ ...neutral, recognition: 90 }, active);
    expect(high.drives.approvalDrive).toBeGreaterThan(low.drives.approvalDrive);
    expect(high.drives.approachPressure).toBeGreaterThan(low.drives.approachPressure);
    const quietLow = computeMotivationResponse({ ...neutral, recognition: 10 }, sit({}));
    const quietHigh = computeMotivationResponse({ ...neutral, recognition: 90 }, sit({}));
    expect(quietHigh.drives.approachPressure).toBe(quietLow.drives.approachPressure);
  });

  it('keeps autonomy live under autonomy threat through withdrawal pressure', () => {
    const active = sit({ autonomyThreat: 0.9 });
    const low = computeMotivationResponse({ ...neutral, autonomy: 10 }, active);
    const high = computeMotivationResponse({ ...neutral, autonomy: 90 }, active);
    expect(high.drives.autonomyDrive).toBeGreaterThan(low.drives.autonomyDrive);
    expect(high.drives.withdrawalPressure).toBeGreaterThan(low.drives.withdrawalPressure);
  });

  it('keeps achievement live when a goal opportunity exists', () => {
    const active = sit({ achievementOpportunity: 0.9 });
    const low = computeMotivationResponse({ ...neutral, achievement: 10 }, active);
    const high = computeMotivationResponse({ ...neutral, achievement: 90 }, active);
    expect(high.drives.achievementDrive).toBeGreaterThan(low.drives.achievementDrive);
    expect(high.drives.approachPressure).toBeGreaterThan(low.drives.approachPressure);
  });

  it('keeps impact live when influence opportunity exists', () => {
    const active = sit({ influenceOpportunity: 0.9 });
    const low = computeMotivationResponse({ ...neutral, impact: 10 }, active);
    const high = computeMotivationResponse({ ...neutral, impact: 90 }, active);
    expect(high.drives.influenceDrive).toBeGreaterThan(low.drives.influenceDrive);
    expect(high.drives.approachPressure).toBeGreaterThan(low.drives.approachPressure);
  });

  it('keeps predictability live under instability through security and withdrawal', () => {
    const active = sit({ uncertainty: 0.8, instability: 0.9 });
    const low = computeMotivationResponse({ ...neutral, predictability: 10 }, active);
    const high = computeMotivationResponse({ ...neutral, predictability: 90 }, active);
    expect(high.drives.securityDrive).toBeGreaterThan(low.drives.securityDrive);
    expect(high.drives.withdrawalPressure).toBeGreaterThan(low.drives.withdrawalPressure);
  });

  it('keeps stability live under instability through security and withdrawal', () => {
    const active = sit({ uncertainty: 0.8, instability: 0.9 });
    const low = computeMotivationResponse({ ...neutral, stability: 10 }, active);
    const high = computeMotivationResponse({ ...neutral, stability: 90 }, active);
    expect(high.drives.securityDrive).toBeGreaterThan(low.drives.securityDrive);
    expect(high.drives.withdrawalPressure).toBeGreaterThan(low.drives.withdrawalPressure);
  });

  it('does not manufacture approach/withdrawal from high needs without matching context', () => {
    const response = computeMotivationResponse({ connection: 100, belonging: 100, recognition: 100, autonomy: 100, achievement: 100, impact: 100, predictability: 100, stability: 100 }, sit({}));
    expect(response.drives.approachPressure).toBe(0);
    expect(response.drives.withdrawalPressure).toBe(0);
  });
});
