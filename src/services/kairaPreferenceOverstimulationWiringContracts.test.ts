import { describe, expect, it } from 'vitest';
import { computePreferenceResponse, preferencesFromFineTune } from './preferenceEngine';
import { integrateBehaviorLayers } from './behaviorIntegrationEngine';

const personality = { humor: 50, authority: 50, empathy: 50, patience: 50, seriousness: 50, communication: 50 } as any;
const intenseSituation = { noveltyOpportunity: 0.08, complexityOpportunity: 0.08, intensityLevel: 0.95, depthOpportunity: 0.08, playOpportunity: 0.08, competitionOpportunity: 0.08, emotionalSeriousness: 0.05 };
const calmSituation = { ...intenseSituation, intensityLevel: 0.1 };

function integrate(preferences: any) {
  return integrateBehaviorLayers({
    personality,
    dynamicState: { anger: 0, stress: 0, relationship: { hurtScore: 0, conflictScore: 0, conversationState: 'active' } } as any,
    semanticEvent: { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' } as any,
    personalityTendency: { behaviorSignals: { assertivePressure: 0.2, analysisPressure: 0.2 } } as any,
    motivation: { drives: { approachPressure: 0.2, withdrawalPressure: 0.1 } } as any,
    values: { behaviorSignals: { moralObjection: 0, boundaryPressure: 0, autonomyDefense: 0, accountabilityPressure: 0 } } as any,
    preferences,
    social: { behaviorSignals: { affiliationPressure: 0.3, carePressure: 0.2, leadershipPressure: 0.2, resistancePressure: 0, disclosurePressure: 0.2, socialDistancePressure: 0 } } as any,
    boundaries: { hardStop: false, violationPressure: 0, behaviorSignals: { boundaryAssertion: 0, distancePressure: 0, escalationPressure: 0, repairOpenness: 0.1, disengagementPressure: 0 } } as any,
    expression: { humor: { enabled: false, strength: 0 }, speech: { questionDrive: 0.5, brevity: 0.2 }, inhibition: 0 } as any,
  });
}

describe('preference overstimulation downstream wiring', () => {
  it('maps the CharacterTab intensity preference key into the stable preference profile', () => {
    expect(preferencesFromFineTune({ 'preferences.stimulation.intensity': 17 }).intensity).toBe(17);
  });

  it('makes low preferred intensity reduce final engagement and shorten response under actual high intensity', () => {
    const low = computePreferenceResponse({ ...preferencesFromFineTune({}), intensity: 10 }, intenseSituation);
    const high = computePreferenceResponse({ ...preferencesFromFineTune({}), intensity: 90 }, intenseSituation);
    expect(low.behaviorSignals.overstimulationPressure).toBeGreaterThan(high.behaviorSignals.overstimulationPressure);
    const lowIntegrated = integrate(low);
    const highIntegrated = integrate(high);
    expect(lowIntegrated.pressures.engagement).toBeLessThan(highIntegrated.pressures.engagement);
    expect(lowIntegrated.decision.responseLength).toBe('short');
    expect(lowIntegrated.decision.distance).toBeCloseTo(highIntegrated.decision.distance, 6);
    expect(lowIntegrated.decision.continueConversation).toBe(true);
  });

  it('does not create overstimulation behavior when incoming intensity is calm', () => {
    const low = computePreferenceResponse({ ...preferencesFromFineTune({}), intensity: 10 }, calmSituation);
    const high = computePreferenceResponse({ ...preferencesFromFineTune({}), intensity: 90 }, calmSituation);
    expect(low.behaviorSignals.overstimulationPressure).toBe(0);
    expect(high.behaviorSignals.overstimulationPressure).toBe(0);
    expect(integrate(low).decision.responseLength).toBe(integrate(high).decision.responseLength);
  });
});
