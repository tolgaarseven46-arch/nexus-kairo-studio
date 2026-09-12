import { describe, expect, it } from 'vitest';
import {
  computeExpressionStyle,
  expressionStyleFromFineTune,
  type ExpressionSituation,
  type ExpressionStyleProfile,
} from './expressionStyleEngine';
import { integrateBehaviorLayers } from './behaviorIntegrationEngine';
import { createClientBehaviorPolicy, normalizeBehaviorPolicyInput } from './behaviorPolicyInput';

const personality = { humor: 50, authority: 50, empathy: 50, patience: 50, seriousness: 50, communication: 50 } as any;
const neutralHumor: ExpressionStyleProfile = {
  absurd: 0, irony: 0, sarcasm: 0, dark: 0, affiliative: 0, aggressive: 0, selfDirected: 0, wordplay: 0,
  contextInhibition: 0, verbosity: 50, informality: 50, emotionalDisplay: 50, questionDrive: 50,
};
const neutralState = { anger: 0, stress: 0, relationship: { hurtScore: 0, conflictScore: 0, warmth: 80, conversationState: 'active' } } as any;
const neutralSituation: ExpressionSituation = { seriousContext: 0, hostileContext: 0, playfulContext: 0.25 };
const playfulSituation: ExpressionSituation = { seriousContext: 0, hostileContext: 0, playfulContext: 1 };
const hostilePlayfulSituation: ExpressionSituation = { seriousContext: 0, hostileContext: 1, playfulContext: 1 };
const seriousSituation: ExpressionSituation = { seriousContext: 1, hostileContext: 0, playfulContext: 0.25 };

function integrate(expression: any) {
  return integrateBehaviorLayers({
    personality,
    dynamicState: neutralState,
    semanticEvent: { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' } as any,
    personalityTendency: { behaviorSignals: { assertivePressure: 0.2, analysisPressure: 0.2 } } as any,
    motivation: { drives: { approachPressure: 0.2, withdrawalPressure: 0.1 } } as any,
    values: { behaviorSignals: { moralObjection: 0, boundaryPressure: 0, autonomyDefense: 0, accountabilityPressure: 0 } } as any,
    preferences: { behaviorSignals: { engagementDrive: 0.2, depthDrive: 0.2, overstimulationPressure: 0 } } as any,
    social: { behaviorSignals: { affiliationPressure: 0.35, carePressure: 0.2, leadershipPressure: 0.2, resistancePressure: 0, disclosurePressure: 0.2, socialDistancePressure: 0 } } as any,
    boundaries: { hardStop: false, violationPressure: 0, behaviorSignals: { boundaryAssertion: 0, distancePressure: 0, escalationPressure: 0, repairOpenness: 0.1, disengagementPressure: 0 } } as any,
    expression,
  });
}

const humorCases: Array<{
  key: keyof ExpressionStyleProfile;
  mode: NonNullable<ReturnType<typeof computeExpressionStyle>['humor']['dominantMode']>;
  situation: ExpressionSituation;
}> = [
  { key: 'absurd', mode: 'absurd', situation: playfulSituation },
  { key: 'irony', mode: 'irony', situation: playfulSituation },
  { key: 'sarcasm', mode: 'sarcasm', situation: hostilePlayfulSituation },
  { key: 'dark', mode: 'dark', situation: playfulSituation },
  { key: 'affiliative', mode: 'affiliative', situation: playfulSituation },
  { key: 'aggressive', mode: 'aggressive', situation: hostilePlayfulSituation },
  { key: 'selfDirected', mode: 'selfDirected', situation: playfulSituation },
  { key: 'wordplay', mode: 'wordplay', situation: playfulSituation },
];

describe('expression downstream coverage', () => {
  it('maps all 13 CharacterTab expression keys', () => {
    const p = expressionStyleFromFineTune({
      'expression.humor.absurd': 61,
      'expression.humor.irony': 62,
      'expression.humor.sarcasm': 63,
      'expression.humor.dark': 64,
      'expression.humor.affiliative': 65,
      'expression.humor.aggressive': 66,
      'expression.humor.selfDirected': 67,
      'expression.humor.wordplay': 68,
      'expression.humor.contextInhibition': 69,
      'expression.speech.verbosity': 70,
      'expression.speech.informality': 71,
      'expression.speech.emotionalDisplay': 72,
      'expression.speech.questionDrive': 73,
    });
    expect(p).toMatchObject({ absurd: 61, irony: 62, sarcasm: 63, dark: 64, affiliative: 65, aggressive: 66, selfDirected: 67, wordplay: 68, contextInhibition: 69, verbosity: 70, informality: 71, emotionalDisplay: 72, questionDrive: 73 });
  });

  for (const { key, mode, situation } of humorCases) {
    it('keeps ' + mode + ' humor live through integrated humor pressure and policy mode', () => {
      const low = computeExpressionStyle({ ...neutralHumor, [key]: 0 }, situation, neutralState);
      const high = computeExpressionStyle({ ...neutralHumor, [key]: 100 }, situation, neutralState);
      expect(high.humor.dominantMode).toBe(mode);
      expect(high.humor.strength).toBeGreaterThan(low.humor.strength);
      const integrated = integrate(high);
      expect(integrated.pressures.humor).toBeGreaterThan(0);
      expect(integrated.decision.humorAllowed).toBe(true);
      const policy = normalizeBehaviorPolicyInput(createClientBehaviorPolicy(integrated.decision, integrated.pressures, high));
      expect(policy?.expressionStyle?.humorMode).toBe(mode);
    });
  }

  it('keeps context inhibition live by suppressing humor without creating a boundary decision', () => {
    const low = computeExpressionStyle({ ...neutralHumor, absurd: 90, contextInhibition: 0 }, playfulSituation, neutralState);
    const high = computeExpressionStyle({ ...neutralHumor, absurd: 90, contextInhibition: 90 }, playfulSituation, neutralState);
    expect(high.inhibition).toBeGreaterThan(low.inhibition);
    expect(integrate(high).pressures.humor).toBeLessThan(integrate(low).pressures.humor);
    expect(integrate(high).decision.distance).toBeCloseTo(integrate(low).decision.distance, 6);
  });

  it('keeps verbosity live at final response length', () => {
    const low = computeExpressionStyle({ ...neutralHumor, verbosity: 10 }, neutralSituation, neutralState);
    const high = computeExpressionStyle({ ...neutralHumor, verbosity: 90 }, neutralSituation, neutralState);
    expect(low.speech.brevity).toBeGreaterThan(high.speech.brevity);
    expect(integrate(low).decision.responseLength).toBe('short');
    expect(integrate(high).decision.responseLength).toBe('medium');
  });

  it('keeps question drive live at final askQuestion decision', () => {
    const low = computeExpressionStyle({ ...neutralHumor, questionDrive: 10 }, neutralSituation, neutralState);
    const high = computeExpressionStyle({ ...neutralHumor, questionDrive: 90 }, neutralSituation, neutralState);
    expect(integrate(low).decision.askQuestion).toBe(false);
    expect(integrate(high).decision.askQuestion).toBe(true);
  });

  it('keeps informality and emotional display live through the client behavior policy seam', () => {
    const low = computeExpressionStyle({ ...neutralHumor, informality: 10, emotionalDisplay: 10 }, neutralSituation, neutralState);
    const high = computeExpressionStyle({ ...neutralHumor, informality: 90, emotionalDisplay: 90 }, neutralSituation, neutralState);
    const lowIntegrated = integrate(low);
    const highIntegrated = integrate(high);
    const lowPolicy = normalizeBehaviorPolicyInput(createClientBehaviorPolicy(lowIntegrated.decision, lowIntegrated.pressures, low));
    const highPolicy = normalizeBehaviorPolicyInput(createClientBehaviorPolicy(highIntegrated.decision, highIntegrated.pressures, high));
    expect(highPolicy?.expressionStyle?.informality).toBeGreaterThan(lowPolicy?.expressionStyle?.informality ?? 0);
    expect(highPolicy?.expressionStyle?.emotionalDisplay).toBeGreaterThan(lowPolicy?.expressionStyle?.emotionalDisplay ?? 0);
  });

  it('context-gates dark humor in a serious situation instead of forcing the slider preference', () => {
    const playful = computeExpressionStyle({ ...neutralHumor, dark: 100 }, playfulSituation, neutralState);
    const serious = computeExpressionStyle({ ...neutralHumor, dark: 100 }, seriousSituation, neutralState);
    expect(playful.humor.strength).toBeGreaterThan(serious.humor.strength);
    expect(serious.inhibition).toBeGreaterThan(playful.inhibition);
  });
});
