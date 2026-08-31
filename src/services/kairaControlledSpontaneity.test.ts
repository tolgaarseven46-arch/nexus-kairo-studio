import { describe, expect, it } from 'vitest';
import {
  decideKairaControlledSpontaneity,
  kairaControlledSpontaneityInstruction,
} from './kairaControlledSpontaneity';

const plan = (overrides: any = {}) => ({
  move: 'natural_reaction',
  stance: 'open',
  register: 'casual',
  relationshipLevel: 'close',
  continueConversation: true,
  allowQuestion: false,
  allowHumor: true,
  allowAffection: true,
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
  anger: 10,
  relationship: {
    warmth: 80,
    trust: 80,
    conflictScore: 0,
    hurtScore: 0,
    familiarityDays: 45,
    interactionCount: 80,
  },
}) as any;

const history: any[] = [
  { sender: 'user', text: 'dün bilgisayarı toparladım sonunda', participantName: 'Tolga' },
  { sender: 'droit', text: 'iyi olmuş ya', participantName: 'Kaira' },
  { sender: 'user', text: 'bugün de biraz iş güç işte', participantName: 'Tolga' },
];

describe('controlled spontaneity safety gates', () => {
  it('selects a supported recent-topic nudge only when the low random roll wins', () => {
    const decision = decideKairaControlledSpontaneity(
      { responsePlan: plan(), dynamicState: state(), history },
      () => 0.02,
    );
    expect(decision.mode).toBe('recent_topic_nudge');
    expect(decision.eligible).toBe(true);
    expect(decision.probability).toBe(0.12);
    expect(decision.sourceText).toBe('bugün de biraz iş güç işte');
  });

  it('usually chooses none when the roll is above the relationship probability', () => {
    const decision = decideKairaControlledSpontaneity(
      { responsePlan: plan(), dynamicState: state(), history },
      () => 0.8,
    );
    expect(decision.mode).toBe('none');
    expect(decision.eligible).toBe(true);
    expect(decision.reason).toBe('roll_not_selected');
  });

  it('never activates on factual/question dialogue moves', () => {
    const decision = decideKairaControlledSpontaneity(
      { responsePlan: plan({ move: 'answer_or_clarify' }), dynamicState: state(), history },
      () => 0,
    );
    expect(decision.mode).toBe('none');
    expect(decision.eligible).toBe(false);
  });

  it('never activates while hurt, irritated, withdrawn or repairing', () => {
    for (const mode of ['hurt', 'irritated', 'withdrawn', 'repairing']) {
      const decision = decideKairaControlledSpontaneity(
        { responsePlan: plan(), dynamicState: state(mode), history },
        () => 0,
      );
      expect(decision.mode).toBe('none');
      expect(decision.reason).toBe('qualitative_reaction_active');
    }
  });

  it('never reopens a closed or non-open conversation', () => {
    for (const p of [
      plan({ continueConversation: false }),
      plan({ stance: 'distant' }),
      plan({ stance: 'closed' }),
    ]) {
      const decision = decideKairaControlledSpontaneity(
        { responsePlan: p, dynamicState: state(), history },
        () => 0,
      );
      expect(decision.mode).toBe('none');
      expect(decision.reason).toBe('conversation_not_open');
    }
  });

  it('refuses sensitive/unsupported prior turns as spontaneous topic sources', () => {
    const unsafeHistory: any[] = [
      { sender: 'user', text: 'salak mısın ya', participantName: 'Tolga' },
      { sender: 'user', text: 'moralim çok bozuk bugün', participantName: 'Tolga' },
      { sender: 'user', text: 'özür dilerim', participantName: 'Tolga' },
    ];
    const decision = decideKairaControlledSpontaneity(
      { responsePlan: plan(), dynamicState: state(), history: unsafeHistory },
      () => 0,
    );
    expect(decision.mode).toBe('none');
    expect(decision.reason).toBe('no_safe_prior_topic');
  });

  it('instruction explicitly cannot grant a blocked question permission', () => {
    const decision = decideKairaControlledSpontaneity(
      { responsePlan: plan({ allowQuestion: false }), dynamicState: state(), history },
      () => 0,
    );
    const instruction = kairaControlledSpontaneityInstruction(decision, plan({ allowQuestion: false }));
    expect(instruction).toContain('Soru sorma; bu nudge soru izni vermez.');
    expect(instruction).toContain('ResponsePlan/BehaviorContract');
  });
});
