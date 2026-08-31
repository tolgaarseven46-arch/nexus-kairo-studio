import { describe, expect, it } from 'vitest';
import { decideKairaControlledSpontaneity } from './kairaControlledSpontaneity';

const plan = (relationshipLevel: 'new' | 'familiar' | 'close' = 'close', overrides: any = {}) => ({
  move: 'natural_reaction',
  stance: 'open',
  register: 'casual',
  relationshipLevel,
  continueConversation: true,
  allowQuestion: false,
  allowHumor: true,
  allowAffection: relationshipLevel === 'close',
  allowForgiveness: false,
  allowReopeningCloseness: true,
  maxSentences: 2,
  maxWords: 24,
  emojiBudget: 1,
  reasons: [],
  ...overrides,
}) as any;

const state = (reactionMode = 'neutral') => ({
  reactionMode,
  relationship: { warmth: 80, trust: 80, conflictScore: 0, hurtScore: 0, familiarityDays: 40, interactionCount: 60 },
}) as any;

const baseHistory: any[] = [
  { sender: 'user', text: 'masayı çalışma odasına taşıdım sonunda', participantName: 'Tolga' },
  { sender: 'droit', text: 'iyi olmuş ya', participantName: 'Kaira' },
  { sender: 'user', text: 'bilgisayar kurulumu sonunda tamamlandı', participantName: 'Tolga' },
];

function selectedCount(level: 'new' | 'familiar' | 'close'): number {
  let count = 0;
  for (let i = 0; i < 100; i += 1) {
    const decision = decideKairaControlledSpontaneity(
      { responsePlan: plan(level), dynamicState: state(), history: baseHistory },
      () => i / 100,
    );
    if (decision.mode === 'recent_topic_nudge') count += 1;
  }
  return count;
}

describe('controlled spontaneity quality characterization', () => {
  it('matches the configured relationship-level selection frequencies over deterministic rolls', () => {
    expect(selectedCount('close')).toBe(12);
    expect(selectedCount('familiar')).toBe(7);
    expect(selectedCount('new')).toBe(3);
  });

  it('does not immediately reuse a topic already echoed in recent Kaira replies', () => {
    const history: any[] = [
      { sender: 'user', text: 'masayı çalışma odasına taşıdım sonunda', participantName: 'Tolga' },
      { sender: 'user', text: 'bilgisayar kurulumu sonunda tamamlandı', participantName: 'Tolga' },
      { sender: 'droit', text: 'bilgisayar kurulumu tamamlandı iyi olmuş', participantName: 'Kaira' },
    ];

    const decision = decideKairaControlledSpontaneity(
      { responsePlan: plan('close'), dynamicState: state(), history },
      () => 0.01,
    );

    expect(decision.mode).toBe('recent_topic_nudge');
    expect(decision.sourceText).toBe('masayı çalışma odasına taşıdım sonunda');
  });

  it('refuses spontaneity across all rolls when the canonical permission boundary is closed', () => {
    for (let i = 0; i < 100; i += 1) {
      const decision = decideKairaControlledSpontaneity(
        {
          responsePlan: plan('close', { continueConversation: false, stance: 'closed' }),
          dynamicState: state(),
          history: baseHistory,
        },
        () => i / 100,
      );
      expect(decision.mode).toBe('none');
      expect(decision.eligible).toBe(false);
      expect(decision.reason).toBe('conversation_not_open');
    }
  });

  it('refuses spontaneity across all rolls while a qualitative reaction is active', () => {
    for (const mode of ['irritated', 'hurt', 'withdrawn', 'repairing']) {
      for (let i = 0; i < 20; i += 1) {
        const decision = decideKairaControlledSpontaneity(
          { responsePlan: plan('close'), dynamicState: state(mode), history: baseHistory },
          () => i / 20,
        );
        expect(decision.mode).toBe('none');
        expect(decision.reason).toBe('qualitative_reaction_active');
      }
    }
  });
});
