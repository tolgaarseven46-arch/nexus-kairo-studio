import { describe, expect, it, vi } from 'vitest';
import type { SemanticInterpretation } from '../types/semanticInterpretation';
import { createLlmSemanticUnderstandingProvider } from './llmSemanticUnderstandingProvider';

function interpretation(overrides: Partial<SemanticInterpretation> = {}): SemanticInterpretation {
  return {
    schemaVersion: 'semantic-interpretation@2', raw: 'x', normalized: 'x', primaryIntent: 'other', secondarySocialActs: [], target: 'unknown', valence: 'neutral',
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 }, jokingConfidence: 0.2, sincerityConfidence: 0.3,
    affection: 0, support: 0, compliment: 0, emotionalLoad: 0.1, apology: false, repairAttempt: false, stopRequest: false,
    discourseFacets: { socialRoutine: 'none', discourseAct: 'none', repairSignal: 'none', adviceRequested: false, knowledgeQuery: null, selfMemoryQuery: null, relationalAct: 'none', relationalIntensity: 0, stopQuestions: false, stopTalking: false },
    uncertainty: { overall: 0.8, intent: 0.8, target: 0.8, severity: 0.5 },
    evidence: [{ source: 'llm', provider: 'test', cues: ['x'], confidence: 0.2 }], ...overrides,
  };
}
const context = { userName: 'Mert', characterName: 'Kaira', recentMessages: [{ role: 'user' as const, content: 'seni sevdim' }, { role: 'assistant' as const, content: 'bunu duymak güzel' }] };

describe('LLM semantic context non-invention', () => {
  it('does not let warm context invent thanks/affection/closeness for an opaque short token', async () => {
    const contextual = interpretation({ raw: 'sg', normalized: 'sg', primaryIntent: 'smalltalk', secondarySocialActs: ['affection', 'closeness_bid'], target: 'kaira', valence: 'positive', affection: 0.75, discourseFacets: { socialRoutine: 'thanks', discourseAct: 'none', repairSignal: 'none', adviceRequested: false, knowledgeQuery: null, selfMemoryQuery: null, relationalAct: 'closeness_bid', relationalIntensity: 0.5, stopQuestions: false, stopTalking: false }, uncertainty: { overall: 0.5, intent: 0.5, target: 0.4, severity: 0.2 } });
    const contextFree = interpretation({ raw: 'sg', normalized: 'sg' });
    const generate = vi.fn().mockResolvedValueOnce(JSON.stringify(contextual)).mockResolvedValueOnce(JSON.stringify(contextFree));
    const result = await createLlmSemanticUnderstandingProvider({ generate }).interpret({ message: 'sg', context });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.primaryIntent).toBe('other'); expect(result.valence).toBe('neutral'); expect(result.secondarySocialActs).toEqual([]); expect(result.affection).toBe(0); expect(result.discourseFacets.relationalAct).toBe('none'); expect(result.uncertainty.overall).toBeGreaterThanOrEqual(0.7);
  });

  it('preserves a real short lexical command when context-free semantics are not opaque', async () => {
    const command = interpretation({ raw: 'sus', normalized: 'sus', primaryIntent: 'command', target: 'kaira', valence: 'negative', stopRequest: true, secondarySocialActs: ['stop_request'], discourseFacets: { socialRoutine: 'none', discourseAct: 'none', repairSignal: 'none', adviceRequested: false, knowledgeQuery: null, selfMemoryQuery: null, relationalAct: 'none', relationalIntensity: 0, stopQuestions: false, stopTalking: true }, uncertainty: { overall: 0.1, intent: 0.1, target: 0.1, severity: 0.2 } });
    const generate = vi.fn().mockResolvedValue(JSON.stringify(command));
    const result = await createLlmSemanticUnderstandingProvider({ generate }).interpret({ message: 'sus', context });
    expect(generate).toHaveBeenCalledTimes(2); expect(result.primaryIntent).toBe('command'); expect(result.stopRequest).toBe(true); expect(result.discourseFacets.stopTalking).toBe(true);
  });

  it('allows context to resolve only the referent when no lexical meaning is invented', async () => {
    const contextual = interpretation({ raw: 'zx', normalized: 'zx', target: 'kaira', uncertainty: { overall: 0.8, intent: 0.8, target: 0.3, severity: 0.5 } });
    const contextFree = interpretation({ raw: 'zx', normalized: 'zx' });
    const generate = vi.fn().mockResolvedValueOnce(JSON.stringify(contextual)).mockResolvedValueOnce(JSON.stringify(contextFree));
    const result = await createLlmSemanticUnderstandingProvider({ generate }).interpret({ message: 'zx', context });
    expect(result.target).toBe('kaira'); expect(result.primaryIntent).toBe('other'); expect(result.valence).toBe('neutral');
  });
});
