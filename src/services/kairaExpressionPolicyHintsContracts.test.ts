import { describe, expect, it } from 'vitest';
import { createClientBehaviorPolicy, normalizeBehaviorPolicyInput } from './behaviorPolicyInput';
import type { ExpressionStyleResponse } from './expressionStyleEngine';
import { computeKairoSpeechIdentity } from './kairoSpeechIdentity';
import type { DroitDynamicState, DroitPersonalityTraits, ReasoningTrace } from '../types/nexus';

const decision = { priority: 'expression' as const, continueConversation: true, humorAllowed: true, askQuestion: true, acknowledgeComplaint: false, repairAllowed: true, stance: 'neutral' as const, responseLength: 'medium' as const, directness: 0.5, warmth: 0.5, distance: 0, explanation: [] };
const personality = { humor: 60, communication: 50, seriousness: 40, authority: 50, decisionMaking: 50, empathy: 50 } as DroitPersonalityTraits;
const state = { anger: 0, stress: 0, happiness: 50, calmness: 50, confidence: 50, surprise: 0 } as DroitDynamicState;
const trace = { messageInterpretation: { sentiment: 'nötr' } } as ReasoningTrace;

describe('expression style policy hints', () => {
  it('preserves normalized HOW hints without changing behavior-policy schema version', () => {
    const expression = { humor: { enabled: true, dominantMode: 'irony', strength: 0.8 }, speech: { brevity: 0.4, informality: 0.9, emotionalDisplay: 0.8, questionDrive: 0.5 }, inhibition: 0.1, legacyTraits: {} } as ExpressionStyleResponse;
    const policy = createClientBehaviorPolicy(decision, undefined, expression);
    expect(policy.schemaVersion).toBe('behavior-policy@1');
    const normalized = normalizeBehaviorPolicyInput(policy);
    expect(normalized?.expressionStyle?.humorMode).toBe('irony');
    expect(normalized?.expressionStyle?.informality).toBeCloseTo(0.9);
    expect(normalized?.expressionStyle?.emotionalDisplay).toBeCloseTo(0.8);
  });

  it('makes informality and emotional display visible in speech identity', () => {
    const low = computeKairoSpeechIdentity(personality, state, trace, { humorMode: null, informality: 0.1, emotionalDisplay: 0.1 });
    const high = computeKairoSpeechIdentity(personality, state, trace, { humorMode: 'wordplay', informality: 0.9, emotionalDisplay: 0.9 });
    expect(high.slangLevel).toBeGreaterThan(low.slangLevel);
    expect(high.informalityLevel).toBe(90);
    expect(high.emotionalDisplayLevel).toBe(90);
    expect(high.humorMode).toBe('wordplay');
    expect(high.instructions.join(' ')).toContain('wordplay');
  });

  it('clamps untrusted server-bound style hints and drops invalid humor modes', () => {
    const normalized = normalizeBehaviorPolicyInput({ schemaVersion: 'behavior-policy@1', source: 'client_behavior_integration', decision, expressionStyle: { humorMode: 'invalid-mode', informality: 9, emotionalDisplay: -3 } });
    expect(normalized?.expressionStyle).toEqual({ humorMode: null, informality: 1, emotionalDisplay: 0 });
  });
});
