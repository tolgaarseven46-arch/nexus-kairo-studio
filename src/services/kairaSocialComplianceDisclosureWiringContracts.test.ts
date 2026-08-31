import { describe, expect, it } from 'vitest';
import { computeSocialOrientationResponse, socialOrientationFromFineTune } from './socialOrientationEngine';
import { integrateBehaviorLayers } from './behaviorIntegrationEngine';

const neutralProfile = socialOrientationFromFineTune({});
const neutralSituation = { affiliationOpportunity: 0.15, vulnerabilitySignal: 0.05, challengeSignal: 0.1, requestSignal: 0.15, coercionSignal: 0, intimacySignal: 0.05, betrayalSignal: 0.05 };
const personality = { humor: 50, authority: 50, empathy: 50, patience: 50, seriousness: 50, communication: 50 } as any;

function integrate(social: any, semanticEvent: any) {
  return integrateBehaviorLayers({
    personality,
    dynamicState: { anger: 0, stress: 0, relationship: { hurtScore: 0, conflictScore: 0, conversationState: 'active' } } as any,
    semanticEvent,
    personalityTendency: { behaviorSignals: { assertivePressure: 0.3, analysisPressure: 0.3 } } as any,
    motivation: { drives: { approachPressure: 0.2, withdrawalPressure: 0.1 } } as any,
    values: { behaviorSignals: { moralObjection: 0, boundaryPressure: 0, autonomyDefense: 0, accountabilityPressure: 0 } } as any,
    preferences: { behaviorSignals: { engagementDrive: 0.2, depthDrive: 0.2 } } as any,
    social,
    boundaries: { hardStop: false, violationPressure: 0, behaviorSignals: { boundaryAssertion: 0, distancePressure: 0, escalationPressure: 0, repairOpenness: 0.2, disengagementPressure: 0 } } as any,
    expression: { humor: { enabled: false, strength: 0 }, speech: { questionDrive: 0.5, brevity: 0.4 }, inhibition: 0 } as any,
  });
}

describe('social compliance and disclosure downstream wiring', () => {
  it('maps both CharacterTab social keys into the stable social profile', () => {
    const profile = socialOrientationFromFineTune({ 'social.agency.compliance': 83, 'social.trust.disclosure': 77 });
    expect(profile.compliance).toBe(83);
    expect(profile.disclosure).toBe(77);
  });

  it('makes low compliance increase directness only under coercion context', () => {
    const coercionSituation = { ...neutralSituation, coercionSignal: 0.95 };
    const low = computeSocialOrientationResponse({ ...neutralProfile, compliance: 10 }, coercionSituation);
    const high = computeSocialOrientationResponse({ ...neutralProfile, compliance: 90 }, coercionSituation);
    const lowDecision = integrate(low, { coercion: 1, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' });
    const highDecision = integrate(high, { coercion: 1, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' });
    expect(low.behaviorSignals.resistancePressure).toBeGreaterThan(high.behaviorSignals.resistancePressure);
    expect(lowDecision.decision.directness).toBeGreaterThan(highDecision.decision.directness);

    const lowNeutral = computeSocialOrientationResponse({ ...neutralProfile, compliance: 10 }, neutralSituation);
    const highNeutral = computeSocialOrientationResponse({ ...neutralProfile, compliance: 90 }, neutralSituation);
    const lowNeutralDecision = integrate(lowNeutral, { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' });
    const highNeutralDecision = integrate(highNeutral, { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' });
    expect(lowNeutralDecision.decision.directness).toBeCloseTo(highNeutralDecision.decision.directness, 6);
  });

  it('makes disclosure willingness change warmth in a safe intimacy context without overriding hard boundaries', () => {
    const intimacySituation = { ...neutralSituation, affiliationOpportunity: 0.7, intimacySignal: 0.9 };
    const low = computeSocialOrientationResponse({ ...neutralProfile, disclosure: 10 }, intimacySituation);
    const high = computeSocialOrientationResponse({ ...neutralProfile, disclosure: 90 }, intimacySituation);
    const semantic = { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' };
    expect(high.behaviorSignals.disclosurePressure).toBeGreaterThan(low.behaviorSignals.disclosurePressure);
    expect(integrate(high, semantic).decision.warmth).toBeGreaterThan(integrate(low, semantic).decision.warmth);
  });
});
