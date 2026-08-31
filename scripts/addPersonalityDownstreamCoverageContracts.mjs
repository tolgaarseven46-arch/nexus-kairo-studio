import fs from 'node:fs';

const testPath = 'src/services/kairaPersonalityDownstreamCoverageContracts.test.ts';
fs.writeFileSync(testPath, `import { describe, expect, it } from 'vitest';
import { personalityTendenciesFromFineTune, computePersonalityTendencyResponse, type PersonalityTendencyProfile, type PersonalitySituation } from './personalityTendencyEngine';
import { integrateBehaviorLayers } from './behaviorIntegrationEngine';

const neutral: PersonalityTendencyProfile = { confidence: 50, directness: 50, stubbornness: 50, analysisDepth: 50, cognitiveFlexibility: 50, decisiveness: 50 };
const sit = (partial: Partial<PersonalitySituation>): PersonalitySituation => ({ conflict: 0.1, ambiguity: 0.2, emotionalLoad: 0.15, decisionDemand: 0.2, correctionSignal: 0.05, ...partial });

function integrate(personalityTendency: any) {
  return integrateBehaviorLayers({
    personality: { humor: 50, authority: 50, empathy: 50, patience: 50, seriousness: 50, communication: 50 } as any,
    dynamicState: { anger: 0, stress: 0, relationship: { hurtScore: 0, conflictScore: 0, conversationState: 'active' } } as any,
    semanticEvent: { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' } as any,
    personalityTendency,
    motivation: { drives: { approachPressure: 0.1, withdrawalPressure: 0 } } as any,
    values: { behaviorSignals: { moralObjection: 0, boundaryPressure: 0, autonomyDefense: 0, accountabilityPressure: 0 } } as any,
    preferences: { behaviorSignals: { engagementDrive: 0.1, depthDrive: 0.1, overstimulationPressure: 0 } } as any,
    social: { behaviorSignals: { affiliationPressure: 0.25, carePressure: 0.15, leadershipPressure: 0, resistancePressure: 0, disclosurePressure: 0.1, socialDistancePressure: 0 } } as any,
    boundaries: { hardStop: false, violationPressure: 0, behaviorSignals: { boundaryAssertion: 0, distancePressure: 0, escalationPressure: 0, disengagementPressure: 0, repairOpenness: 0.5 } } as any,
    expression: { humor: { strength: 0, enabled: false, dominantMode: null }, inhibition: 1, speech: { brevity: 0.2, questionDrive: 0.4, informality: 0.5, emotionalDisplay: 0.5 } } as any,
  });
}

describe('personality tendency downstream coverage', () => {
  it('maps all six CharacterTab personality keys, including the legacy deciveness spelling', () => {
    expect(personalityTendenciesFromFineTune({
      'personality.assertion.confidence': 61,
      'personality.assertion.directness': 62,
      'personality.assertion.stubbornness': 63,
      'personality.cognition.analysisDepth': 64,
      'personality.cognition.flexibility': 65,
      'personality.cognition.deciveness': 66,
    })).toEqual({ confidence: 61, directness: 62, stubbornness: 63, analysisDepth: 64, cognitiveFlexibility: 65, decisiveness: 66 });
  });

  it('keeps confidence live through assertive pressure and final directness', () => {
    const active = sit({ decisionDemand: 0.65 });
    const low = computePersonalityTendencyResponse({ ...neutral, confidence: 10 }, active);
    const high = computePersonalityTendencyResponse({ ...neutral, confidence: 90 }, active);
    expect(high.behaviorSignals.assertivePressure).toBeGreaterThan(low.behaviorSignals.assertivePressure);
    expect(integrate(high).decision.directness).toBeGreaterThan(integrate(low).decision.directness);
  });

  it('keeps directness live through assertive pressure and final directness', () => {
    const active = sit({ conflict: 0.6 });
    const low = computePersonalityTendencyResponse({ ...neutral, directness: 10 }, active);
    const high = computePersonalityTendencyResponse({ ...neutral, directness: 90 }, active);
    expect(high.behaviorSignals.assertivePressure).toBeGreaterThan(low.behaviorSignals.assertivePressure);
    expect(integrate(high).decision.directness).toBeGreaterThan(integrate(low).decision.directness);
  });

  it('keeps stubbornness live under correction as lower revision readiness and higher final directness', () => {
    const correction = sit({ correctionSignal: 0.95, ambiguity: 0.5 });
    const low = computePersonalityTendencyResponse({ ...neutral, stubbornness: 10 }, correction);
    const high = computePersonalityTendencyResponse({ ...neutral, stubbornness: 90 }, correction);
    expect(high.behaviorSignals.revisionReadiness).toBeLessThan(low.behaviorSignals.revisionReadiness);
    expect(integrate(high).decision.directness).toBeGreaterThan(integrate(low).decision.directness);
  });

  it('keeps analysis depth live through analysis pressure and final long response in analytical context', () => {
    const analytical = sit({ ambiguity: 0.95, decisionDemand: 0.75 });
    const low = computePersonalityTendencyResponse({ ...neutral, analysisDepth: 10 }, analytical);
    const high = computePersonalityTendencyResponse({ ...neutral, analysisDepth: 100 }, analytical);
    expect(high.behaviorSignals.analysisPressure).toBeGreaterThan(low.behaviorSignals.analysisPressure);
    expect(integrate(high).decision.responseLength).toBe('long');
    expect(integrate(low).decision.responseLength).not.toBe('long');
  });

  it('keeps cognitive flexibility live under correction as higher revision readiness and lower final directness', () => {
    const correction = sit({ correctionSignal: 0.95, ambiguity: 0.5 });
    const low = computePersonalityTendencyResponse({ ...neutral, cognitiveFlexibility: 10 }, correction);
    const high = computePersonalityTendencyResponse({ ...neutral, cognitiveFlexibility: 90 }, correction);
    expect(high.behaviorSignals.revisionReadiness).toBeGreaterThan(low.behaviorSignals.revisionReadiness);
    expect(integrate(high).decision.directness).toBeLessThan(integrate(low).decision.directness);
  });

  it('keeps decisiveness live in real decision demand through decision and final assertive pressure', () => {
    const decision = sit({ decisionDemand: 0.95, ambiguity: 0.25 });
    const low = computePersonalityTendencyResponse({ ...neutral, decisiveness: 10 }, decision);
    const high = computePersonalityTendencyResponse({ ...neutral, decisiveness: 90 }, decision);
    expect(high.behaviorSignals.decisionPressure).toBeGreaterThan(low.behaviorSignals.decisionPressure);
    expect(high.behaviorSignals.assertivePressure).toBeGreaterThan(low.behaviorSignals.assertivePressure);
    expect(integrate(high).decision.directness).toBeGreaterThan(integrate(low).decision.directness);
  });

  it('does not let decisiveness create extra assertiveness in neutral non-decision chat', () => {
    const quiet = sit({ decisionDemand: 0.2, ambiguity: 0.2 });
    const low = computePersonalityTendencyResponse({ ...neutral, decisiveness: 10 }, quiet);
    const high = computePersonalityTendencyResponse({ ...neutral, decisiveness: 90 }, quiet);
    expect(high.behaviorSignals.decisionPressure).toBeGreaterThan(low.behaviorSignals.decisionPressure);
    expect(high.behaviorSignals.assertivePressure).toBe(low.behaviorSignals.assertivePressure);
    expect(integrate(high).decision.directness).toBe(integrate(low).decision.directness);
  });

  it('does not let flexibility soften unrelated neutral chat without a correction signal', () => {
    const quiet = sit({ correctionSignal: 0.05, ambiguity: 0.2 });
    const low = computePersonalityTendencyResponse({ ...neutral, cognitiveFlexibility: 10 }, quiet);
    const high = computePersonalityTendencyResponse({ ...neutral, cognitiveFlexibility: 90 }, quiet);
    expect(high.behaviorSignals.revisionReadiness).toBeGreaterThan(low.behaviorSignals.revisionReadiness);
    expect(high.behaviorSignals.assertivePressure).toBe(low.behaviorSignals.assertivePressure);
    expect(integrate(high).decision.directness).toBe(integrate(low).decision.directness);
  });
});
`);
if (!fs.readFileSync(testPath, 'utf8').includes('personality tendency downstream coverage')) throw new Error('missing personality coverage marker');
console.log('Added personality downstream coverage contracts');
