import { describe, expect, it } from 'vitest';
import { integrateBehaviorLayers } from './behaviorIntegrationEngine';
import { interpretSemanticEvent } from './semanticEventEngine';

const baseInput = (message: string) => ({
  personality: { humor: 90, authority: 80, empathy: 90, patience: 90, seriousness: 20, communication: 90 } as any,
  userMessage: message,
  dynamicState: { anger: 0, stress: 0, relationship: { hurtScore: 0, conflictScore: 0, conversationState: 'active' } } as any,
  personalityTendency: { behaviorSignals: { assertivePressure: 0.95, analysisPressure: 0.9, revisionReadiness: 0.5, decisionPressure: 0.9 } } as any,
  motivation: { drives: { approachPressure: 0.98, withdrawalPressure: 0 } } as any,
  values: { behaviorSignals: { moralObjection: 0, boundaryPressure: 0, autonomyDefense: 0, accountabilityPressure: 0 } } as any,
  preferences: { behaviorSignals: { engagementDrive: 0.98, depthDrive: 0.95, overstimulationPressure: 0 } } as any,
  social: { behaviorSignals: { affiliationPressure: 1, carePressure: 1, disclosurePressure: 1, leadershipPressure: 0.9, resistancePressure: 0, socialDistancePressure: 0 } } as any,
  boundaries: { hardStop: false, violationPressure: 0, behaviorSignals: { boundaryAssertion: 0, distancePressure: 0, escalationPressure: 0, disengagementPressure: 0, repairOpenness: 1 } } as any,
  expression: { humor: { strength: 1, enabled: true, dominantMode: 'affiliative' }, inhibition: 0, speech: { brevity: 0, questionDrive: 1, informality: 1, emotionalDisplay: 1 } } as any,
});

describe('explicit semantic authority contracts', () => {
  it('semantic parser distinguishes stop talking from stop questions', () => {
    expect(interpretSemanticEvent('sus artık').stopTalking).toBe(true);
    expect(interpretSemanticEvent('sus artık').stopQuestions).toBe(false);
    expect(interpretSemanticEvent('soru sorma artık').stopQuestions).toBe(true);
  });

  it('stop-questions overrides maximum question and engagement drive without ending conversation', () => {
    const result = integrateBehaviorLayers(baseInput('soru sorma artık'));
    expect(result.decision.continueConversation).toBe(true);
    expect(result.decision.askQuestion).toBe(false);
    expect(result.decision.acknowledgeComplaint).toBe(true);
    expect(result.decision.explanation.some((x) => x.includes('soru sormama'))).toBe(true);
  });

  it('stop-talking overrides maximum warmth, approach, engagement, depth and humor', () => {
    const result = integrateBehaviorLayers(baseInput('sus artık'));
    expect(result.decision.continueConversation).toBe(false);
    expect(result.decision.humorAllowed).toBe(false);
    expect(result.decision.askQuestion).toBe(false);
    expect(result.decision.responseLength).toBe('short');
    expect(result.decision.acknowledgeComplaint).toBe(true);
    expect(result.decision.explanation.some((x) => x.includes('konuşmayı durdurma'))).toBe(true);
  });
});
