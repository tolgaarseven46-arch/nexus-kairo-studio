import { describe, expect, it, vi } from 'vitest';
import type { SemanticInterpretation } from '../types/semanticInterpretation';
import { createLlmSemanticUnderstandingProvider } from './llmSemanticUnderstandingProvider';

function base(overrides: Partial<SemanticInterpretation> = {}): SemanticInterpretation {
  return {
    schemaVersion: 'semantic-interpretation@2', raw: 'x', normalized: 'x', primaryIntent: 'other', secondarySocialActs: [], target: 'unknown', valence: 'neutral',
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 }, jokingConfidence: 0, sincerityConfidence: 0.9,
    affection: 0, support: 0, compliment: 0, emotionalLoad: 0, apology: false, repairAttempt: false, stopRequest: false,
    discourseFacets: { socialRoutine: 'none', discourseAct: 'none', repairSignal: 'none', adviceRequested: false, knowledgeQuery: null, selfMemoryQuery: null, relationalAct: 'none', relationalIntensity: 0, stopQuestions: false, stopTalking: false },
    uncertainty: { overall: 0.2, intent: 0.2, target: 0.2, severity: 0.2 }, evidence: [], ...overrides,
  };
}

describe('topic-local closure semantic invariant', () => {
  it('topic_shift cannot become a full conversation stop', async () => {
    const generated = base({
      raw: 'konuyu kapatalım', normalized: 'konuyu kapatalım', primaryIntent: 'command', target: 'event', secondarySocialActs: ['stop_request'], stopRequest: true,
      discourseFacets: { socialRoutine: 'none', discourseAct: 'topic_shift', repairSignal: 'none', adviceRequested: false, knowledgeQuery: null, selfMemoryQuery: null, relationalAct: 'none', relationalIntensity: 0.1, stopQuestions: true, stopTalking: true },
    });
    const generate = vi.fn().mockResolvedValue(JSON.stringify(generated));
    const result = await createLlmSemanticUnderstandingProvider({ generate }).interpret({ message: 'konuyu kapatalım' });
    expect(result.discourseFacets.discourseAct).toBe('topic_shift');
    expect(result.discourseFacets.stopTalking).toBe(false);
    expect(result.discourseFacets.stopQuestions).toBe(false);
    expect(result.stopRequest).toBe(false);
    expect(result.secondarySocialActs).not.toContain('stop_request');
  });

  it('preserves an actual full stop request', async () => {
    const generated = base({
      raw: 'sus artık', normalized: 'sus artık', primaryIntent: 'command', target: 'kaira', secondarySocialActs: ['stop_request'], stopRequest: true,
      discourseFacets: { socialRoutine: 'none', discourseAct: 'none', repairSignal: 'none', adviceRequested: false, knowledgeQuery: null, selfMemoryQuery: null, relationalAct: 'challenge', relationalIntensity: 0.5, stopQuestions: false, stopTalking: true },
    });
    const generate = vi.fn().mockResolvedValue(JSON.stringify(generated));
    const result = await createLlmSemanticUnderstandingProvider({ generate }).interpret({ message: 'sus artık' });
    expect(result.discourseFacets.stopTalking).toBe(true);
    expect(result.stopRequest).toBe(true);
    expect(result.secondarySocialActs).toContain('stop_request');
  });
});
