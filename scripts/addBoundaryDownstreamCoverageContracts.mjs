import fs from 'node:fs';

const testPath = 'src/services/kairaBoundaryDownstreamCoverageContracts.test.ts';
fs.writeFileSync(testPath, `import { describe, expect, it } from 'vitest';
import { boundariesFromFineTune, computeBoundaryResponse, type BoundaryProfile, type BoundarySituation } from './boundaryEngine';
import { integrateBehaviorLayers } from './behaviorIntegrationEngine';

const personality = { humor: 50, authority: 50, empathy: 50, patience: 50, seriousness: 50, communication: 50 } as any;
const neutralProfile: BoundaryProfile = { disrespect: 50, manipulation: 50, privacy: 50, assertiveness: 50, escalation: 50, forgiveness: 50 };
const neutralState = { anger: 0, stress: 0, relationship: { hurtScore: 0, conflictScore: 0, repeatedNegativeCount: 0, warmth: 80, conversationState: 'active' } } as any;
const damagedState = { anger: 0, stress: 0, relationship: { hurtScore: 35, conflictScore: 30, repeatedNegativeCount: 2, warmth: 45, conversationState: 'active' } } as any;

const situation = (partial: Partial<BoundarySituation>): BoundarySituation => ({
  disrespect: 0,
  manipulation: 0,
  privacyViolation: 0,
  coercion: 0,
  apology: 0,
  repairAttempt: 0,
  hardStop: false,
  ...partial,
});

function integrate(boundaries: any, semanticEvent: any = {}) {
  return integrateBehaviorLayers({
    personality,
    dynamicState: neutralState,
    semanticEvent: { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general', ...semanticEvent } as any,
    personalityTendency: { behaviorSignals: { assertivePressure: 0.2, analysisPressure: 0.2 } } as any,
    motivation: { drives: { approachPressure: 0.2, withdrawalPressure: 0.1 } } as any,
    values: { behaviorSignals: { moralObjection: 0, boundaryPressure: 0, autonomyDefense: 0, accountabilityPressure: 0 } } as any,
    preferences: { behaviorSignals: { engagementDrive: 0.2, depthDrive: 0.2, overstimulationPressure: 0 } } as any,
    social: { behaviorSignals: { affiliationPressure: 0.35, carePressure: 0.2, leadershipPressure: 0.2, resistancePressure: 0, disclosurePressure: 0.2, socialDistancePressure: 0 } } as any,
    boundaries,
    expression: { humor: { strength: 0, enabled: false, dominantMode: null }, inhibition: 1, speech: { brevity: 0.5, questionDrive: 0.5, informality: 0.5, emotionalDisplay: 0.5 } } as any,
  });
}

describe('boundary downstream coverage', () => {
  it('maps all six CharacterTab boundary keys', () => {
    expect(boundariesFromFineTune({
      'boundaries.violation.disrespect': 61,
      'boundaries.violation.manipulation': 62,
      'boundaries.violation.privacy': 63,
      'boundaries.enforcement.assertiveness': 64,
      'boundaries.enforcement.escalation': 65,
      'boundaries.enforcement.forgiveness': 66,
    })).toEqual({ disrespect: 61, manipulation: 62, privacy: 63, assertiveness: 64, escalation: 65, forgiveness: 66 });
  });

  it('keeps disrespect sensitivity live through violation and final boundary pressure', () => {
    const low = computeBoundaryResponse({ ...neutralProfile, disrespect: 10 }, situation({ disrespect: 0.9 }), neutralState);
    const high = computeBoundaryResponse({ ...neutralProfile, disrespect: 90 }, situation({ disrespect: 0.9 }), neutralState);
    expect(high.violations.disrespect).toBeGreaterThan(low.violations.disrespect);
    expect(high.violationPressure).toBeGreaterThan(low.violationPressure);
    expect(integrate(high).pressures.boundary).toBeGreaterThan(integrate(low).pressures.boundary);
  });

  it('keeps manipulation sensitivity live through violation and final boundary pressure', () => {
    const low = computeBoundaryResponse({ ...neutralProfile, manipulation: 10 }, situation({ manipulation: 0.9 }), neutralState);
    const high = computeBoundaryResponse({ ...neutralProfile, manipulation: 90 }, situation({ manipulation: 0.9 }), neutralState);
    expect(high.violations.manipulation).toBeGreaterThan(low.violations.manipulation);
    expect(high.violationPressure).toBeGreaterThan(low.violationPressure);
    expect(integrate(high).pressures.boundary).toBeGreaterThan(integrate(low).pressures.boundary);
  });

  it('keeps privacy sensitivity live through violation and final boundary pressure', () => {
    const low = computeBoundaryResponse({ ...neutralProfile, privacy: 10 }, situation({ privacyViolation: 0.9 }), neutralState);
    const high = computeBoundaryResponse({ ...neutralProfile, privacy: 90 }, situation({ privacyViolation: 0.9 }), neutralState);
    expect(high.violations.privacy).toBeGreaterThan(low.violations.privacy);
    expect(high.violationPressure).toBeGreaterThan(low.violationPressure);
    expect(integrate(high).pressures.boundary).toBeGreaterThan(integrate(low).pressures.boundary);
  });

  it('keeps assertiveness live under coercion and at final directness/boundary pressure', () => {
    const low = computeBoundaryResponse({ ...neutralProfile, assertiveness: 10 }, situation({ coercion: 0.9 }), neutralState);
    const high = computeBoundaryResponse({ ...neutralProfile, assertiveness: 90 }, situation({ coercion: 0.9 }), neutralState);
    expect(high.violations.coercion).toBeGreaterThan(low.violations.coercion);
    expect(high.behaviorSignals.boundaryAssertion).toBeGreaterThan(low.behaviorSignals.boundaryAssertion);
    expect(integrate(high, { coercion: 0.9 }).pressures.boundary).toBeGreaterThan(integrate(low, { coercion: 0.9 }).pressures.boundary);
    expect(integrate(high, { coercion: 0.9 }).decision.directness).toBeGreaterThan(integrate(low, { coercion: 0.9 }).decision.directness);
  });

  it('keeps escalation live only after a real violation and raises downstream pressure', () => {
    const low = computeBoundaryResponse({ ...neutralProfile, escalation: 10 }, situation({ disrespect: 0.9 }), damagedState);
    const high = computeBoundaryResponse({ ...neutralProfile, escalation: 90 }, situation({ disrespect: 0.9 }), damagedState);
    expect(high.behaviorSignals.escalationPressure).toBeGreaterThan(low.behaviorSignals.escalationPressure);
    expect(high.behaviorSignals.disengagementPressure).toBeGreaterThan(low.behaviorSignals.disengagementPressure);
    expect(integrate(high).pressures.boundary).toBeGreaterThan(integrate(low).pressures.boundary);

    const noViolation = computeBoundaryResponse({ ...neutralProfile, escalation: 100 }, situation({}), neutralState);
    expect(noViolation.behaviorSignals.escalationPressure).toBe(0);
    expect(noViolation.violationPressure).toBe(0);
  });

  it('keeps forgiveness live on repair signals and lowers downstream distance/pressure', () => {
    const repair = situation({ disrespect: 0.55, apology: 0.9, repairAttempt: 0.8 });
    const low = computeBoundaryResponse({ ...neutralProfile, forgiveness: 10 }, repair, damagedState);
    const high = computeBoundaryResponse({ ...neutralProfile, forgiveness: 90 }, repair, damagedState);
    expect(high.behaviorSignals.repairOpenness).toBeGreaterThan(low.behaviorSignals.repairOpenness);
    expect(high.behaviorSignals.disengagementPressure).toBeLessThan(low.behaviorSignals.disengagementPressure);
    expect(integrate(high, { apology: true, repairAttempt: true }).decision.distance).toBeLessThan(integrate(low, { apology: true, repairAttempt: true }).decision.distance);
  });

  it('never lets forgiveness override a hard red line', () => {
    const hard = situation({ hardStop: true, disrespect: 1, apology: 1, repairAttempt: 1 });
    const response = computeBoundaryResponse({ ...neutralProfile, forgiveness: 100 }, hard, damagedState);
    const integrated = integrate(response, { apology: true, repairAttempt: true });
    expect(response.hardStop).toBe(true);
    expect(response.behaviorSignals.repairOpenness).toBe(0);
    expect(response.behaviorSignals.disengagementPressure).toBe(1);
    expect(integrated.decision.continueConversation).toBe(false);
    expect(integrated.decision.stance).toBe('disengage');
  });
});
`);

const source = fs.readFileSync(testPath, 'utf8');
if (!source.includes('boundary downstream coverage')) throw new Error('missing boundary downstream coverage marker');
console.log('Added boundary downstream coverage contracts');
