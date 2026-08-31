import { describe, expect, it } from 'vitest';
import { computePersonalityTendencyResponse, personalityTendenciesFromFineTune } from './personalityTendencyEngine';
import { integrateBehaviorLayers } from './behaviorIntegrationEngine';

const personality = { humor: 50, authority: 50, empathy: 50, patience: 50, seriousness: 50, communication: 50 } as any;
const neutralSituation = { conflict: 0.1, ambiguity: 0.2, emotionalLoad: 0.15, decisionDemand: 0.2, correctionSignal: 0.05 };

function integrate(personalityTendency: any) {
  return integrateBehaviorLayers({
    personality,
    dynamicState: { anger: 0, stress: 0, relationship: { hurtScore: 0, conflictScore: 0, conversationState: 'active' } } as any,
    semanticEvent: { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' } as any,
    personalityTendency,
    motivation: { drives: { approachPressure: 0.2, withdrawalPressure: 0.1 } } as any,
    values: { behaviorSignals: { moralObjection: 0, boundaryPressure: 0, autonomyDefense: 0, accountabilityPressure: 0 } } as any,
    preferences: { behaviorSignals: { engagementDrive: 0.2, depthDrive: 0.2, overstimulationPressure: 0 } } as any,
    social: { behaviorSignals: { affiliationPressure: 0.3, carePressure: 0.2, leadershipPressure: 0.2, resistancePressure: 0, disclosurePressure: 0.2, socialDistancePressure: 0 } } as any,
    boundaries: { hardStop: false, violationPressure: 0, behaviorSignals: { boundaryAssertion: 0, distancePressure: 0, escalationPressure: 0, repairOpenness: 0.1, disengagementPressure: 0 } } as any,
    expression: { humor: { enabled: false, strength: 0 }, speech: { questionDrive: 0.5, brevity: 0.2 }, inhibition: 0 } as any,
  });
}

describe('personality decision and revision downstream wiring', () => {
  it('maps CharacterTab decisiveness, flexibility and stubbornness keys into the stable personality profile', () => {
    const profile = personalityTendenciesFromFineTune({
      'personality.cognition.deciveness': 81,
      'personality.cognition.flexibility': 73,
      'personality.assertion.stubbornness': 27,
    });
    expect(profile.decisiveness).toBe(81);
    expect(profile.cognitiveFlexibility).toBe(73);
    expect(profile.stubbornness).toBe(27);
  });

  it('makes decisiveness increase final directness when an actual decision is demanded', () => {
    const situation = { ...neutralSituation, decisionDemand: 0.85 };
    const low = computePersonalityTendencyResponse({ ...personalityTendenciesFromFineTune({}), decisiveness: 10 }, situation);
    const high = computePersonalityTendencyResponse({ ...personalityTendenciesFromFineTune({}), decisiveness: 90 }, situation);
    expect(high.behaviorSignals.decisionPressure).toBeGreaterThan(low.behaviorSignals.decisionPressure);
    expect(high.behaviorSignals.assertivePressure).toBeGreaterThan(low.behaviorSignals.assertivePressure);
    expect(integrate(high).decision.directness).toBeGreaterThan(integrate(low).decision.directness);
  });

  it('does not turn decisiveness into general-purpose directness in neutral context', () => {
    const low = computePersonalityTendencyResponse({ ...personalityTendenciesFromFineTune({}), decisiveness: 10 }, neutralSituation);
    const high = computePersonalityTendencyResponse({ ...personalityTendenciesFromFineTune({}), decisiveness: 90 }, neutralSituation);
    expect(integrate(high).decision.directness).toBeCloseTo(integrate(low).decision.directness, 6);
  });

  it('makes high revision readiness soften final directness in an actual correction context', () => {
    const situation = { ...neutralSituation, correctionSignal: 0.9 };
    const receptive = computePersonalityTendencyResponse(
      { ...personalityTendenciesFromFineTune({}), cognitiveFlexibility: 90, stubbornness: 10 },
      situation,
    );
    const rigid = computePersonalityTendencyResponse(
      { ...personalityTendenciesFromFineTune({}), cognitiveFlexibility: 10, stubbornness: 90 },
      situation,
    );
    expect(receptive.behaviorSignals.revisionReadiness).toBeGreaterThan(rigid.behaviorSignals.revisionReadiness);
    expect(receptive.behaviorSignals.assertivePressure).toBeLessThan(rigid.behaviorSignals.assertivePressure);
    expect(integrate(receptive).decision.directness).toBeLessThan(integrate(rigid).decision.directness);
  });
});
