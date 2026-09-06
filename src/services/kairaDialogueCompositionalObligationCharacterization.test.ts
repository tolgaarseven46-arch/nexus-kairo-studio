import { describe, expect, it } from 'vitest';
import { planDialogueResponse } from './kairoDialogueDecisionEngine';
import type { SemanticEvent } from './semanticEventEngine';

function event(overrides: Partial<SemanticEvent> = {}): SemanticEvent {
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

describe('DialogueDecision compound obligation characterization', () => {
  it('does not let a thanks routine erase an explicit advice obligation', () => {
    const decision = planDialogueResponse(
      [],
      'teşekkür ederim, bana bir mantık sorusu sorsana',
      'Tolga',
      event({
        raw: 'teşekkür ederim, bana bir mantık sorusu sorsana',
        normalized: 'teşekkür ederim, bana bir mantık sorusu sorsana',
        socialRoutine: 'thanks',
        adviceRequested: true,
      }),
    );

    expect(decision.move).toBe('answer_or_clarify');
    expect(decision.obligation?.type).toBe('answer_or_clarify');
    expect(decision.socialRoutine).toBe('thanks');
  });

  it('does not let an agreement routine erase a typed question obligation', () => {
    const decision = planDialogueResponse(
      [],
      'tamam, peki Mert neden gelmedi?',
      'Tolga',
      event({
        raw: 'tamam, peki Mert neden gelmedi?',
        normalized: 'tamam, peki mert neden gelmedi?',
        intent: 'information_request',
        socialRoutine: 'agreement',
        target: 'third_party',
      }),
    );

    expect(decision.move).toBe('answer_or_clarify');
    expect(decision.obligation?.type).toBe('answer_or_clarify');
    expect(decision.socialRoutine).toBe('agreement');
  });

  it('does not let a social routine erase a canonical recall obligation', () => {
    const decision = planDialogueResponse(
      [],
      'eyvallah, Mert yarın ne yapacaktı?',
      'Tolga',
      event({
        raw: 'eyvallah, Mert yarın ne yapacaktı?',
        normalized: 'eyvallah, mert yarın ne yapacaktı?',
        socialRoutine: 'thanks',
        discourseAct: 'recall_request',
        intent: 'information_request',
        target: 'third_party',
      }),
    );

    expect(decision.move).toBe('grounded_recall');
    expect(decision.socialRoutine).toBe('thanks');
  });
  it('keeps a pure thanks routine as the primary move', () => {
    const decision = planDialogueResponse(
      [],
      'teşekkür ederim',
      'Tolga',
      event({ socialRoutine: 'thanks' }),
    );
    expect(decision.move).toBe('complete_social_routine');
    expect(decision.socialRoutine).toBe('thanks');
  });

  it('keeps a plain typed information request unchanged without a routine', () => {
    const decision = planDialogueResponse(
      [],
      'Mert neden gelmedi?',
      'Tolga',
      event({ intent: 'information_request', target: 'third_party' }),
    );
    expect(decision.move).toBe('answer_or_clarify');
    expect(decision.obligation?.type).toBe('answer_or_clarify');
    expect(decision.socialRoutine).toBeUndefined();
  });

});
