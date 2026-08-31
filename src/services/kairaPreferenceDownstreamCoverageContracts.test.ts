import { describe, expect, it } from 'vitest';
import { preferencesFromFineTune, computePreferenceResponse, type PreferenceProfile, type PreferenceSituation } from './preferenceEngine';
import { integrateBehaviorLayers } from './behaviorIntegrationEngine';

const neutral: PreferenceProfile = { novelty: 50, complexity: 50, intensity: 50, depth: 50, playfulness: 50, competition: 50 };
const sit = (partial: Partial<PreferenceSituation>): PreferenceSituation => ({ noveltyOpportunity: 0, complexityOpportunity: 0, intensityLevel: 0, depthOpportunity: 0, playOpportunity: 0, competitionOpportunity: 0, emotionalSeriousness: 0, ...partial });

function integrate(preferences: any) {
  return integrateBehaviorLayers({
    personality: { humor: 50, authority: 50, empathy: 50, patience: 50, seriousness: 50, communication: 50 } as any,
    dynamicState: { anger: 0, stress: 0, relationship: { hurtScore: 0, conflictScore: 0, conversationState: 'active' } } as any,
    semanticEvent: { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' } as any,
    personalityTendency: { behaviorSignals: { assertivePressure: 0.2, analysisPressure: 0.2 } } as any,
    motivation: { drives: { approachPressure: 0.1, withdrawalPressure: 0 } } as any,
    values: { behaviorSignals: { moralObjection: 0, boundaryPressure: 0, autonomyDefense: 0, accountabilityPressure: 0 } } as any,
    preferences,
    social: { behaviorSignals: { affiliationPressure: 0.3, carePressure: 0.2, leadershipPressure: 0.1, resistancePressure: 0, disclosurePressure: 0.1, socialDistancePressure: 0 } } as any,
    boundaries: { hardStop: false, violationPressure: 0, behaviorSignals: { boundaryAssertion: 0, distancePressure: 0, escalationPressure: 0, disengagementPressure: 0, repairOpenness: 0.5 } } as any,
    expression: { humor: { strength: 0, enabled: false, dominantMode: null }, inhibition: 1, speech: { brevity: 0.2, questionDrive: 0.5, informality: 0.5, emotionalDisplay: 0.5 } } as any,
  });
}

describe('preference downstream coverage', () => {
  it('maps all six CharacterTab preference keys', () => {
    expect(preferencesFromFineTune({
      'preferences.stimulation.novelty': 61,
      'preferences.stimulation.complexity': 62,
      'preferences.stimulation.intensity': 63,
      'preferences.interaction.depth': 64,
      'preferences.interaction.playfulness': 65,
      'preferences.interaction.competition': 66,
    })).toEqual({ novelty: 61, complexity: 62, intensity: 63, depth: 64, playfulness: 65, competition: 66 });
  });

  it('keeps novelty live through exploration, engagement and final preference pressure', () => {
    const active = sit({ noveltyOpportunity: 0.9 });
    const low = computePreferenceResponse({ ...neutral, novelty: 10 }, active);
    const high = computePreferenceResponse({ ...neutral, novelty: 90 }, active);
    expect(high.behaviorSignals.explorationDrive).toBeGreaterThan(low.behaviorSignals.explorationDrive);
    expect(high.behaviorSignals.engagementDrive).toBeGreaterThan(low.behaviorSignals.engagementDrive);
    expect(integrate(high).pressures.engagement).toBeGreaterThan(integrate(low).pressures.engagement);
  });

  it('keeps complexity live through depth and final response length when depth is actually available', () => {
    const active = sit({ complexityOpportunity: 1, depthOpportunity: 1 });
    const low = computePreferenceResponse({ ...neutral, complexity: 10 }, active);
    const high = computePreferenceResponse({ ...neutral, complexity: 100 }, active);
    expect(high.behaviorSignals.depthDrive).toBeGreaterThan(low.behaviorSignals.depthDrive);
    expect(integrate(high).decision.responseLength).toBe('long');
    expect(integrate(low).decision.responseLength).not.toBe('long');
  });

  it('keeps intensity live in matched high-tempo engagement and low-preference overstimulation', () => {
    const active = sit({ intensityLevel: 0.95 });
    const low = computePreferenceResponse({ ...neutral, intensity: 10 }, active);
    const high = computePreferenceResponse({ ...neutral, intensity: 90 }, active);
    expect(high.attraction.intensity).toBeGreaterThan(low.attraction.intensity);
    expect(high.behaviorSignals.engagementDrive).toBeGreaterThan(low.behaviorSignals.engagementDrive);
    expect(low.behaviorSignals.overstimulationPressure).toBeGreaterThan(high.behaviorSignals.overstimulationPressure);
    expect(integrate(low).decision.responseLength).toBe('short');
    expect(integrate(high).pressures.engagement).toBeGreaterThan(integrate(low).pressures.engagement);
  });

  it('keeps depth live through depth drive and final long response', () => {
    const active = sit({ depthOpportunity: 0.95 });
    const low = computePreferenceResponse({ ...neutral, depth: 10 }, active);
    const high = computePreferenceResponse({ ...neutral, depth: 90 }, active);
    expect(high.behaviorSignals.depthDrive).toBeGreaterThan(low.behaviorSignals.depthDrive);
    expect(integrate(high).decision.responseLength).toBe('long');
    expect(integrate(low).decision.responseLength).not.toBe('long');
  });

  it('keeps playfulness live in playful engagement but suppresses it in serious context', () => {
    const playful = sit({ playOpportunity: 0.95 });
    const low = computePreferenceResponse({ ...neutral, playfulness: 10 }, playful);
    const high = computePreferenceResponse({ ...neutral, playfulness: 90 }, playful);
    expect(high.behaviorSignals.playDrive).toBeGreaterThan(low.behaviorSignals.playDrive);
    expect(integrate(high).pressures.engagement).toBeGreaterThan(integrate(low).pressures.engagement);
    const serious = computePreferenceResponse({ ...neutral, playfulness: 100 }, sit({ playOpportunity: 0.95, emotionalSeriousness: 1 }));
    expect(serious.attraction.playfulness).toBeLessThan(high.attraction.playfulness);
  });

  it('keeps competition live only when competition opportunity exists', () => {
    const active = sit({ competitionOpportunity: 0.95 });
    const low = computePreferenceResponse({ ...neutral, competition: 10 }, active);
    const high = computePreferenceResponse({ ...neutral, competition: 90 }, active);
    expect(high.behaviorSignals.competitionDrive).toBeGreaterThan(low.behaviorSignals.competitionDrive);
    expect(integrate(high).pressures.engagement).toBeGreaterThan(integrate(low).pressures.engagement);
    const quietLow = computePreferenceResponse({ ...neutral, competition: 10 }, sit({}));
    const quietHigh = computePreferenceResponse({ ...neutral, competition: 90 }, sit({}));
    expect(quietHigh.behaviorSignals.engagementDrive).toBe(quietLow.behaviorSignals.engagementDrive);
  });

  it('does not manufacture engagement from high preferences without matching opportunities', () => {
    const response = computePreferenceResponse({ novelty: 100, complexity: 100, intensity: 100, depth: 100, playfulness: 100, competition: 100 }, sit({}));
    expect(response.behaviorSignals.engagementDrive).toBe(0);
    expect(response.behaviorSignals.overstimulationPressure).toBe(0);
  });
});
