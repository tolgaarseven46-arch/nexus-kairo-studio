import { describe, expect, it } from 'vitest';
import { socialOrientationFromFineTune, computeSocialOrientationResponse, type SocialOrientationProfile, type SocialSituation } from './socialOrientationEngine';
import { integrateBehaviorLayers } from './behaviorIntegrationEngine';

const neutral: SocialOrientationProfile = { warmth: 50, empathy: 50, closenessDrive: 50, dominance: 50, initiative: 50, compliance: 50, initialTrust: 50, disclosure: 50 };
const sit = (partial: Partial<SocialSituation>): SocialSituation => ({ affiliationOpportunity: 0, vulnerabilitySignal: 0, challengeSignal: 0, requestSignal: 0, coercionSignal: 0, intimacySignal: 0, betrayalSignal: 0, ...partial });

function integrate(social: any, semanticEvent: any = {}, dynamicState: any = { anger: 0, stress: 0, relationship: { hurtScore: 0, conflictScore: 0, conversationState: 'active' } }) {
  return integrateBehaviorLayers({
    personality: { humor: 50, authority: 50, empathy: 50, patience: 50, seriousness: 50, communication: 50 } as any,
    dynamicState,
    semanticEvent: { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general', ...semanticEvent } as any,
    personalityTendency: { behaviorSignals: { assertivePressure: 0.2, analysisPressure: 0.2 } } as any,
    motivation: { drives: { approachPressure: 0.1, withdrawalPressure: 0 } } as any,
    values: { behaviorSignals: { moralObjection: 0, boundaryPressure: 0, autonomyDefense: 0, accountabilityPressure: 0 } } as any,
    preferences: { behaviorSignals: { engagementDrive: 0.1, depthDrive: 0.1, overstimulationPressure: 0 } } as any,
    social,
    boundaries: { hardStop: false, violationPressure: 0, behaviorSignals: { boundaryAssertion: 0, distancePressure: 0, escalationPressure: 0, disengagementPressure: 0, repairOpenness: 0.5 } } as any,
    expression: { humor: { strength: 0, enabled: false, dominantMode: null }, inhibition: 1, speech: { brevity: 0.2, questionDrive: 0.5, informality: 0.5, emotionalDisplay: 0.5 } } as any,
  });
}

describe('social orientation downstream coverage', () => {
  it('maps all eight CharacterTab social keys', () => {
    expect(socialOrientationFromFineTune({
      'social.communion.warmth': 61,
      'social.communion.empathy': 62,
      'social.communion.closenessDrive': 63,
      'social.agency.dominance': 64,
      'social.agency.initiative': 65,
      'social.agency.compliance': 66,
      'social.trust.initialTrust': 67,
      'social.trust.disclosure': 68,
    })).toEqual({ warmth: 61, empathy: 62, closenessDrive: 63, dominance: 64, initiative: 65, compliance: 66, initialTrust: 67, disclosure: 68 });
  });

  it('keeps warmth live through affiliation and final warmth', () => {
    const active = sit({ affiliationOpportunity: 0.9 });
    const low = computeSocialOrientationResponse({ ...neutral, warmth: 10 }, active);
    const high = computeSocialOrientationResponse({ ...neutral, warmth: 90 }, active);
    expect(high.behaviorSignals.affiliationPressure).toBeGreaterThan(low.behaviorSignals.affiliationPressure);
    expect(integrate(high).decision.warmth).toBeGreaterThan(integrate(low).decision.warmth);
  });

  it('keeps empathy live under vulnerability through care and final warmth', () => {
    const active = sit({ vulnerabilitySignal: 0.9 });
    const low = computeSocialOrientationResponse({ ...neutral, empathy: 10 }, active);
    const high = computeSocialOrientationResponse({ ...neutral, empathy: 90 }, active);
    expect(high.behaviorSignals.carePressure).toBeGreaterThan(low.behaviorSignals.carePressure);
    expect(integrate(high).decision.warmth).toBeGreaterThan(integrate(low).decision.warmth);
  });

  it('keeps closeness drive live in affiliative context through final warmth', () => {
    const active = sit({ affiliationOpportunity: 0.9, intimacySignal: 0.6 });
    const low = computeSocialOrientationResponse({ ...neutral, closenessDrive: 10 }, active);
    const high = computeSocialOrientationResponse({ ...neutral, closenessDrive: 90 }, active);
    expect(high.effective.closeness).toBeGreaterThan(low.effective.closeness);
    expect(high.behaviorSignals.affiliationPressure).toBeGreaterThan(low.behaviorSignals.affiliationPressure);
    expect(integrate(high).decision.warmth).toBeGreaterThan(integrate(low).decision.warmth);
  });

  it('keeps dominance live under challenge/coercion through leadership, resistance and directness', () => {
    const active = sit({ challengeSignal: 0.8, coercionSignal: 0.9 });
    const low = computeSocialOrientationResponse({ ...neutral, dominance: 10 }, active);
    const high = computeSocialOrientationResponse({ ...neutral, dominance: 90 }, active);
    expect(high.behaviorSignals.leadershipPressure).toBeGreaterThan(low.behaviorSignals.leadershipPressure);
    expect(high.behaviorSignals.resistancePressure).toBeGreaterThan(low.behaviorSignals.resistancePressure);
    expect(integrate(high, { coercion: 0.9 }).decision.directness).toBeGreaterThan(integrate(low, { coercion: 0.9 }).decision.directness);
  });

  it('keeps initiative live when social action is available through leadership and directness', () => {
    const active = sit({ affiliationOpportunity: 0.8, requestSignal: 0.8 });
    const low = computeSocialOrientationResponse({ ...neutral, initiative: 10 }, active);
    const high = computeSocialOrientationResponse({ ...neutral, initiative: 90 }, active);
    expect(high.behaviorSignals.leadershipPressure).toBeGreaterThan(low.behaviorSignals.leadershipPressure);
    expect(integrate(high).decision.directness).toBeGreaterThan(integrate(low).decision.directness);
  });

  it('keeps compliance live under coercion as inverse resistance and final directness', () => {
    const active = sit({ requestSignal: 0.7, coercionSignal: 0.9 });
    const low = computeSocialOrientationResponse({ ...neutral, compliance: 10 }, active);
    const high = computeSocialOrientationResponse({ ...neutral, compliance: 90 }, active);
    expect(low.behaviorSignals.resistancePressure).toBeGreaterThan(high.behaviorSignals.resistancePressure);
    expect(integrate(low, { coercion: 0.9 }).decision.directness).toBeGreaterThan(integrate(high, { coercion: 0.9 }).decision.directness);
  });

  it('keeps initial trust live through safety-derived affiliation/disclosure when no relationship history exists', () => {
    const active = sit({ affiliationOpportunity: 0.6, intimacySignal: 0.7 });
    const low = computeSocialOrientationResponse({ ...neutral, initialTrust: 10 }, active);
    const high = computeSocialOrientationResponse({ ...neutral, initialTrust: 90 }, active);
    expect(high.effective.trustOpenness).toBeGreaterThan(low.effective.trustOpenness);
    expect(high.behaviorSignals.disclosurePressure).toBeGreaterThan(low.behaviorSignals.disclosurePressure);
    expect(integrate(high).decision.warmth).toBeGreaterThan(integrate(low).decision.warmth);
  });

  it('keeps disclosure live in intimate context through disclosure pressure and final warmth', () => {
    const active = sit({ intimacySignal: 0.9, affiliationOpportunity: 0.5 });
    const low = computeSocialOrientationResponse({ ...neutral, disclosure: 10 }, active);
    const high = computeSocialOrientationResponse({ ...neutral, disclosure: 90 }, active);
    expect(high.effective.disclosure).toBeGreaterThan(low.effective.disclosure);
    expect(high.behaviorSignals.disclosurePressure).toBeGreaterThan(low.behaviorSignals.disclosurePressure);
    expect(integrate(high).decision.warmth).toBeGreaterThan(integrate(low).decision.warmth);
  });

  it('does not let high social openness erase betrayal-driven distance', () => {
    const damagedState = {
      anger: 20, stress: 20, calmness: 50, happiness: 40, confidence: 50, surprise: 10, lastStatus: 'test',
      relationship: { warmth: 30, trust: 20, hurtScore: 80, conflictScore: 60, interactionCount: 30, repeatedNegativeCount: 3, conversationState: 'active' }
    } as any;
    const openProfile = { warmth: 100, empathy: 100, closenessDrive: 100, dominance: 50, initiative: 100, compliance: 100, initialTrust: 100, disclosure: 100 };
    const safe = computeSocialOrientationResponse(openProfile, sit({ betrayalSignal: 0 }), damagedState);
    const betrayed = computeSocialOrientationResponse(openProfile, sit({ betrayalSignal: 1 }), damagedState);
    expect(betrayed.behaviorSignals.socialDistancePressure).toBeGreaterThan(safe.behaviorSignals.socialDistancePressure);
    expect(integrate(betrayed, {}, damagedState).decision.distance).toBeGreaterThan(integrate(safe, {}, damagedState).decision.distance);
  });
});
