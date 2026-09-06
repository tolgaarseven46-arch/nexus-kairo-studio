import { describe, expect, it } from 'vitest';
import { planDialogueResponse } from './kairoDialogueDecisionEngine';
import type { SemanticEvent } from './semanticEventEngine';

function semantic(overrides: Partial<SemanticEvent>): SemanticEvent {
  return {
    raw: '',
    normalized: '',
    intent: 'general_chat',
    socialRoutine: 'none',
    discourseAct: 'none',
    repairSignal: 'none',
    adviceRequested: false,
    knowledgeQuery: null,
    valence: 'neutral',
    target: 'unknown',
    relationalAct: 'none',
    relationalIntensity: 0,
    severity: 0,
    insult: false,
    redLine: false,
    disrespect: 0,
    coercion: 0,
    manipulation: 0,
    privacyViolation: 0,
    apology: false,
    repairAttempt: false,
    stopQuestions: false,
    stopTalking: false,
    frustration: 0,
    emotionalLoad: 0,
    affection: 0,
    support: 0,
    compliment: 0,
    ...overrides,
  };
}

describe('compound dialogue obligation regression', () => {
  it('preserves the substantive obligation while retaining concurrent thanks context', () => {
    const advice = planDialogueResponse(
      [],
      'teşekkür ederim, bana bir mantık sorusu sorsana',
      'Tolga',
      semantic({ socialRoutine: 'thanks', adviceRequested: true }),
    );
    expect(advice).toMatchObject({
      move: 'answer_or_clarify',
      socialRoutine: 'thanks',
      obligation: { type: 'answer_or_clarify' },
    });

    const recall = planDialogueResponse(
      [],
      'eyvallah, Mert yarın ne yapacaktı?',
      'Tolga',
      semantic({
        socialRoutine: 'thanks',
        discourseAct: 'recall_request',
        intent: 'information_request',
        target: 'third_party',
      }),
    );
    expect(recall.move).toBe('grounded_recall');
    expect(recall.socialRoutine).toBe('thanks');
  });

  it('does not promote a pure social routine into a substantive obligation', () => {
    const pureThanks = planDialogueResponse(
      [],
      'teşekkür ederim',
      'Tolga',
      semantic({ socialRoutine: 'thanks' }),
    );
    expect(pureThanks.move).toBe('complete_social_routine');
    expect(pureThanks.obligation).toBeUndefined();
  });
});
