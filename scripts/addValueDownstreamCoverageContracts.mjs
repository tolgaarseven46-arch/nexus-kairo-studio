import fs from 'node:fs';

const testPath = 'src/services/kairaValueDownstreamCoverageContracts.test.ts';
fs.writeFileSync(testPath, `import { describe, expect, it } from 'vitest';
import { computeValueResponse, valuesFromFineTune, type ValueProfile, type ValueSituation } from './valueEngine';
import { integrateBehaviorLayers } from './behaviorIntegrationEngine';

const personality = { humor: 50, authority: 50, empathy: 50, patience: 50, seriousness: 50, communication: 50 } as any;
const baseSituation: ValueSituation = { deception: 0.05, unfairness: 0.05, betrayal: 0.05, harm: 0.05, coercion: 0.05, privacyViolation: 0.05, disrespect: 0.05, irresponsibility: 0.05 };

function integrate(values: any) {
  return integrateBehaviorLayers({
    personality,
    dynamicState: { anger: 0, stress: 0, relationship: { hurtScore: 0, conflictScore: 0, conversationState: 'active' } } as any,
    semanticEvent: { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' } as any,
    personalityTendency: { behaviorSignals: { assertivePressure: 0.25, analysisPressure: 0.25 } } as any,
    motivation: { drives: { approachPressure: 0.2, withdrawalPressure: 0.1 } } as any,
    values,
    preferences: { behaviorSignals: { engagementDrive: 0.2, depthDrive: 0.2, overstimulationPressure: 0 } } as any,
    social: { behaviorSignals: { affiliationPressure: 0.3, carePressure: 0.2, leadershipPressure: 0.2, resistancePressure: 0, disclosurePressure: 0.2, socialDistancePressure: 0 } } as any,
    boundaries: { hardStop: false, violationPressure: 0, behaviorSignals: { boundaryAssertion: 0, distancePressure: 0, escalationPressure: 0, repairOpenness: 0.1, disengagementPressure: 0 } } as any,
    expression: { humor: { enabled: false, strength: 0 }, speech: { questionDrive: 0.5, brevity: 0.2 }, inhibition: 0 } as any,
  });
}

const cases: Array<{ key: keyof ValueProfile; situation: keyof ValueSituation }> = [
  { key: 'honesty', situation: 'deception' },
  { key: 'fairness', situation: 'unfairness' },
  { key: 'loyalty', situation: 'betrayal' },
  { key: 'compassion', situation: 'harm' },
  { key: 'freedom', situation: 'coercion' },
  { key: 'privacy', situation: 'privacyViolation' },
  { key: 'respect', situation: 'disrespect' },
  { key: 'responsibility', situation: 'irresponsibility' },
];

describe('value downstream coverage', () => {
  for (const { key, situation } of cases) {
    it('keeps ' + key + ' behaviorally live in its matching context', () => {
      const context = { ...baseSituation, [situation]: 0.9 };
      const neutral = valuesFromFineTune({});
      const lowProfile = { ...neutral, [key]: 10 };
      const highProfile = { ...neutral, [key]: 90 };
      const low = computeValueResponse(lowProfile, context);
      const high = computeValueResponse(highProfile, context);
      expect(high.conflicts[key]).toBeGreaterThan(low.conflicts[key]);
      expect(integrate(high).pressures.values).toBeGreaterThan(integrate(low).pressures.values);
    });
  }

  it('shows compassion remains downstream-live even though protectivePressure is not a separately integrated pressure', () => {
    const context = { ...baseSituation, harm: 0.9 };
    const neutral = valuesFromFineTune({});
    const low = computeValueResponse({ ...neutral, compassion: 10 }, context);
    const high = computeValueResponse({ ...neutral, compassion: 90 }, context);
    expect(high.behaviorSignals.protectivePressure).toBeGreaterThan(low.behaviorSignals.protectivePressure);
    expect(high.behaviorSignals.moralObjection).toBeGreaterThan(low.behaviorSignals.moralObjection);
    expect(integrate(high).pressures.values).toBeGreaterThan(integrate(low).pressures.values);
  });
});
`);

const source = fs.readFileSync(testPath, 'utf8');
if (!source.includes('value downstream coverage')) throw new Error('missing value downstream contract marker');
console.log('Added value downstream coverage contracts');
