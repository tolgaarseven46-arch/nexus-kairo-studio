import { describe, expect, it } from 'vitest';
import { integrateBehaviorLayers } from './behaviorIntegrationEngine';

const basePersonality = { humor: 50, authority: 50, empathy: 50, patience: 50, seriousness: 50, communication: 50 } as any;
const semantic = (partial: any = {}) => ({ coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general', ...partial }) as any;

function input(overrides: any = {}) {
  return {
    personality: basePersonality,
    dynamicState: { anger: 0, stress: 0, relationship: { hurtScore: 0, conflictScore: 0, conversationState: 'active' } },
    semanticEvent: semantic(),
    personalityTendency: { behaviorSignals: { assertivePressure: 0.95, analysisPressure: 0.9, revisionReadiness: 0.5, decisionPressure: 0.9 } },
    motivation: { drives: { approachPressure: 0.95, withdrawalPressure: 0 } },
    values: { behaviorSignals: { moralObjection: 0, boundaryPressure: 0, autonomyDefense: 0, accountabilityPressure: 0 } },
    preferences: { behaviorSignals: { engagementDrive: 0.95, depthDrive: 0.9, overstimulationPressure: 0 } },
    social: { behaviorSignals: { affiliationPressure: 0.95, carePressure: 0.95, disclosurePressure: 0.9, leadershipPressure: 0.9, resistancePressure: 0, socialDistancePressure: 0 } },
    boundaries: { hardStop: false, violationPressure: 0, behaviorSignals: { boundaryAssertion: 0, distancePressure: 0, escalationPressure: 0, disengagementPressure: 0, repairOpenness: 0.8 } },
    expression: { humor: { strength: 1, enabled: true, dominantMode: 'affiliative' }, inhibition: 0, speech: { brevity: 0.05, questionDrive: 0.95, informality: 0.9, emotionalDisplay: 0.9 } },
    ...overrides,
  } as any;
}

describe('cross-family authority contracts', () => {
  it('hard-stop boundary dominates maximum warmth, approach, depth and humor', () => {
    const result = integrateBehaviorLayers(input({
      boundaries: { hardStop: true, violationPressure: 1, behaviorSignals: { boundaryAssertion: 1, distancePressure: 1, escalationPressure: 1, disengagementPressure: 1, repairOpenness: 1 } },
    }));

    expect(result.decision.priority).toBe('boundary');
    expect(result.decision.continueConversation).toBe(false);
    expect(result.decision.humorAllowed).toBe(false);
    expect(result.decision.askQuestion).toBe(false);
    expect(result.decision.repairAllowed).toBe(false);
    expect(result.decision.stance).toBe('disengage');
    expect(result.decision.responseLength).toBe('short');
    expect(result.decision.distance).toBe(1);
    expect(result.decision.warmth).toBe(0);
    expect(result.personality.humor).toBe(0);
  });

  it('hard-stop remains closed even under apology/repair signal and full repair openness', () => {
    const result = integrateBehaviorLayers(input({
      semanticEvent: semantic({ apology: true, repairAttempt: true }),
      boundaries: { hardStop: true, violationPressure: 1, behaviorSignals: { boundaryAssertion: 1, distancePressure: 1, escalationPressure: 1, disengagementPressure: 1, repairOpenness: 1 } },
    }));

    expect(result.decision.priority).toBe('boundary');
    expect(result.decision.continueConversation).toBe(false);
    expect(result.decision.repairAllowed).toBe(false);
    expect(result.decision.warmth).toBe(0);
  });

  it('value conflict outranks goal, preference and expression without forcing disengage', () => {
    const result = integrateBehaviorLayers(input({
      values: { behaviorSignals: { moralObjection: 1, boundaryPressure: 0.8, autonomyDefense: 0.8, accountabilityPressure: 0.8 } },
    }));

    expect(result.decision.priority).toBe('values');
    expect(result.decision.continueConversation).toBe(true);
    expect(result.decision.stance).toBe('firm');
    expect(result.decision.humorAllowed).toBe(false);
    expect(result.decision.explanation.some((x) => x.includes('Değer çatışması'))).toBe(true);
  });

  it('relationship damage outranks strong approach, preference and humor', () => {
    const result = integrateBehaviorLayers(input({
      dynamicState: { anger: 25, stress: 25, relationship: { hurtScore: 85, conflictScore: 75, conversationState: 'active' } },
      social: { behaviorSignals: { affiliationPressure: 0.95, carePressure: 0.9, disclosurePressure: 0.9, leadershipPressure: 0.8, resistancePressure: 0, socialDistancePressure: 0.75 } },
    }));

    expect(result.decision.priority).toBe('relationship');
    expect(result.decision.humorAllowed).toBe(false);
    expect(result.decision.distance).toBeGreaterThan(0.35);
    expect(result.decision.warmth).toBeLessThan(0.7);
    expect(result.decision.explanation.some((x) => x.includes('İlişki hasarı'))).toBe(true);
  });

  it('goal pressure outranks preference and expression when higher authority layers are quiet', () => {
    const result = integrateBehaviorLayers(input());
    expect(result.decision.priority).toBe('goal');
    expect(result.decision.continueConversation).toBe(true);
  });

  it('preference outranks expression when goal pressure is below its gate', () => {
    const result = integrateBehaviorLayers(input({
      motivation: { drives: { approachPressure: 0.1, withdrawalPressure: 0 } },
    }));
    expect(result.decision.priority).toBe('preference');
  });

  it('expression becomes priority only when all higher pressures remain below gates', () => {
    const result = integrateBehaviorLayers(input({
      motivation: { drives: { approachPressure: 0.1, withdrawalPressure: 0 } },
      preferences: { behaviorSignals: { engagementDrive: 0.1, depthDrive: 0.1, overstimulationPressure: 0 } },
    }));
    expect(result.decision.priority).toBe('expression');
    expect(result.decision.humorAllowed).toBe(true);
    expect(result.decision.askQuestion).toBe(true);
  });
});
