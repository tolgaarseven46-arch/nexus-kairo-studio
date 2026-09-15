import { describe, expect, it } from 'vitest';
import type { SemanticInterpretation, SemanticPrimaryIntent } from '../types/semanticInterpretation';
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

const semanticSnapshot = (
  raw: string,
  primaryIntent: SemanticPrimaryIntent,
  overrides: Partial<SemanticInterpretation> = {},
): SemanticInterpretation => ({
  schemaVersion: 'semantic-interpretation@2',
  raw,
  normalized: raw.toLocaleLowerCase('tr-TR'),
  primaryIntent,
  secondarySocialActs: [],
  target: 'unknown',
  valence: 'neutral',
  severity: {
    disrespect: 0,
    coercion: 0,
    manipulation: 0,
    privacy: 0,
    aggression: 0,
  },
  jokingConfidence: 0,
  sincerityConfidence: 1,
  affection: 0,
  support: 0,
  compliment: 0,
  emotionalLoad: 0,
  apology: false,
  repairAttempt: false,
  stopRequest: false,
  discourseFacets: {
    socialRoutine: 'none',
    discourseAct: 'none',
    repairSignal: 'none',
    adviceRequested: false,
    knowledgeQuery: null,
    selfMemoryQuery: null,
    relationalAct: 'none',
    relationalIntensity: 0,
    stopQuestions: false,
    stopTalking: false,
  },
  uncertainty: {
    overall: 0,
    intent: 0,
    target: 0,
    severity: 0,
  },
  evidence: [{ source: 'reconciled', cues: ['test_fixture'], confidence: 1 }],
  ...overrides,
});

const history: any[] = [
  {
    sender: 'user',
    text: 'dün bilgisayarı toparladım sonunda',
    participantName: 'Tolga',
    semanticInterpretation: semanticSnapshot('dün bilgisayarı toparladım sonunda', 'smalltalk'),
  },
  { sender: 'droit', text: 'iyi olmuş ya', participantName: 'Kaira' },
  {
    sender: 'user',
    text: 'bugün de biraz iş güç işte',
    participantName: 'Tolga',
    semanticInterpretation: semanticSnapshot('bugün de biraz iş güç işte', 'smalltalk'),
  },
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
      {
        sender: 'user',
        text: 'salak mısın ya',
        participantName: 'Tolga',
        semanticInterpretation: semanticSnapshot('salak mısın ya', 'insult', {
          severity: {
            disrespect: 0.9,
            coercion: 0,
            manipulation: 0,
            privacy: 0,
            aggression: 0.6,
          },
        }),
      },
      {
        sender: 'user',
        text: 'moralim çok bozuk bugün',
        participantName: 'Tolga',
        semanticInterpretation: semanticSnapshot('moralim çok bozuk bugün', 'emotional_share', {
          valence: 'negative',
          emotionalLoad: 0.8,
        }),
      },
      {
        sender: 'user',
        text: 'özür dilerim',
        participantName: 'Tolga',
        semanticInterpretation: semanticSnapshot('özür dilerim', 'apology', { apology: true }),
      },
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
