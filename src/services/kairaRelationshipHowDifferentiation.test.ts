import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeKairoSpeechIdentity } from './kairoSpeechIdentity';
import { getLanguageMemory } from './kairoLanguageMemory';
import { tryLocalKairoReply } from './kairoLocalLanguageEngine';
import { interpretSemanticEvent } from './semanticEventEngine';

const personality = {
  humor: 80,
  communication: 70,
  seriousness: 35,
  authority: 55,
  decisionMaking: 55,
  empathy: 70,
} as any;
const trace = {
  messageInterpretation: { sentiment: 'nötr' },
  decision: { chosenTone: 'casual' },
} as any;

const stateFor = (level: 'new' | 'familiar' | 'close') => {
  const rel = level === 'new'
    ? { warmth: 45, trust: 45, familiarityDays: 1, interactionCount: 2 }
    : level === 'familiar'
      ? { warmth: 60, trust: 60, familiarityDays: 10, interactionCount: 20 }
      : { warmth: 82, trust: 82, familiarityDays: 45, interactionCount: 80 };
  return {
    calmness: 75,
    anger: 5,
    stress: 15,
    happiness: 75,
    confidence: 75,
    surprise: 5,
    lastStatus: 'Sakin',
    reactionMode: 'neutral',
    relationship: { ...rel, conflictScore: 0, hurtScore: 0 },
  } as any;
};

const planFor = (
  relationshipLevel: 'new' | 'familiar' | 'close',
  allowQuestion = true,
) => ({
  move: 'natural_reaction',
  stance: 'open',
  register: 'casual',
  relationshipLevel,
  continueConversation: true,
  allowQuestion,
  allowHumor: true,
  allowAffection: relationshipLevel === 'close',
  allowForgiveness: false,
  allowReopeningCloseness: true,
  maxSentences: 2,
  maxWords: 24,
  emojiBudget: 1,
  reasons: [],
}) as any;

function collect(
  level: 'new' | 'familiar' | 'close',
  count = 6,
  allowQuestion = true,
): string[] {
  const userId = `relationship-how-${level}-q${allowQuestion ? 1 : 0}`;
  const memory = getLanguageMemory(userId);
  memory.wordWeights = { kanka: 8, ya: 7, valla: 5, aynen: 5, he: 3, iyidir: 4, takılıyorum: 4, senden: 4 };
  memory.phraseWeights = {};
  memory.recentReplies = [];
  memory.interactionCount = 0;
  const replies: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const result = tryLocalKairoReply(
      'naber',
      personality,
      stateFor(level),
      trace,
      userId,
      'natural_reaction',
      planFor(level, allowQuestion),
      interpretSemanticEvent('naber'),
    );
    expect(result.handled).toBe(true);
    expect(result.intent).toBe('how_are_you');
    replies.push(result.reply || '');
  }
  return replies;
}

describe('relationship-level HOW differentiation', () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('keeps speech identity HOW observably ordered without changing semantic permissions', () => {
    const newSpeech = computeKairoSpeechIdentity(personality, stateFor('new'), trace);
    const familiarSpeech = computeKairoSpeechIdentity(personality, stateFor('familiar'), trace);
    const closeSpeech = computeKairoSpeechIdentity(personality, stateFor('close'), trace);

    expect([newSpeech.relationshipLevel, familiarSpeech.relationshipLevel, closeSpeech.relationshipLevel])
      .toEqual(['new', 'familiar', 'close']);
    expect(newSpeech.slangLevel).toBeLessThan(familiarSpeech.slangLevel);
    expect(familiarSpeech.slangLevel).toBeLessThan(closeSpeech.slangLevel);
    expect(newSpeech.warmthLevel).toBeLessThan(familiarSpeech.warmthLevel);
    expect(familiarSpeech.warmthLevel).toBeLessThan(closeSpeech.warmthLevel);
  });

  it('keeps the same local intent while relationship wording grows from measured to familiar to close', () => {
    vi.useFakeTimers();
    const newReplies = collect('new');
    const familiarReplies = collect('familiar');
    const closeReplies = collect('close');

    expect(newReplies.some((reply) => /\bkanka\b|\bbe\b|\bya\b/u.test(reply))).toBe(false);
    expect(familiarReplies.some((reply) => /\bya\b|\bbe\b/u.test(reply))).toBe(true);
    expect(familiarReplies.some((reply) => /\bkanka\b/u.test(reply))).toBe(false);
    expect(closeReplies.some((reply) => /\bkanka\b/u.test(reply))).toBe(true);
  });

  it('preserves relationship HOW even when the canonical plan blocks follow-up questions', () => {
    vi.useFakeTimers();
    const newReplies = collect('new', 6, false);
    const familiarReplies = collect('familiar', 6, false);
    const closeReplies = collect('close', 6, false);

    for (const reply of [...newReplies, ...familiarReplies, ...closeReplies]) {
      expect(reply).not.toMatch(/[?？]/u);
      expect(reply).not.toMatch(/\bsen\b|\bsenden\b|\bnaber\b|\bnasılsın\b/u);
    }
    expect(newReplies.some((reply) => /\bkanka\b|\bya\b/u.test(reply))).toBe(false);
    expect(familiarReplies.some((reply) => /\bya\b/u.test(reply))).toBe(true);
    expect(familiarReplies.some((reply) => /\bkanka\b/u.test(reply))).toBe(false);
    expect(closeReplies.some((reply) => /\bkanka\b/u.test(reply))).toBe(true);
  });
});
