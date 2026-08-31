import { describe, expect, it } from 'vitest';
import {
  buildGroundedDialogueFallback,
  findDialogueDecisionIssues,
  type DialogueDecisionPlan,
} from './kairoDialogueDecisionEngine';

const emotionalPlan: DialogueDecisionPlan = {
  move: 'invite_emotional_context',
  allowFollowUpQuestion: true,
  allowSpeculation: false,
  maxSentences: 1,
  maxWords: 4,
  hasSupportedTargetClaim: false,
  reason: 'first emotional opening',
};

describe('emotional opening effective question permission', () => {
  it('accepts curiosity when the effective response plan allows a question', () => {
    expect(
      findDialogueDecisionIssues('hmm niye', emotionalPlan, {
        allowQuestion: true,
        emojiLevel: 0,
      }),
    ).toEqual([]);
    expect(
      buildGroundedDialogueFallback(emotionalPlan, [], 'moralim bozuk', 'Ali', undefined, true),
    ).toBe('hmm niye');
  });

  it('accepts a minimal acknowledgement and rejects curiosity when higher authority blocks questions', () => {
    expect(
      findDialogueDecisionIssues('hmm', emotionalPlan, {
        allowQuestion: false,
        emojiLevel: 0,
      }),
    ).toEqual([]);
    expect(
      findDialogueDecisionIssues('ne oldu?', emotionalPlan, {
        allowQuestion: false,
        emojiLevel: 0,
      }),
    ).toContain('Diyalog kararı takip sorusunu yasakladığı halde soru eklendi');
    expect(
      buildGroundedDialogueFallback(emotionalPlan, [], 'moralim bozuk', 'Ali', undefined, false),
    ).toBe('hmm');
  });

  it('still rejects over-care or advice while questions are blocked', () => {
    const issues = findDialogueDecisionIssues('üzülme canım', emotionalPlan, {
      allowQuestion: false,
      emojiLevel: 0,
    });
    expect(issues.some((issue) => issue.includes('lakap'))).toBe(true);
  });
});
