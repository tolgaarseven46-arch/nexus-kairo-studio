import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLanguageMemory } from './kairoLanguageMemory';
import { tryLocalKairoReply } from './kairoLocalLanguageEngine';
import { interpretSemanticEvent } from './semanticEventEngine';

const userId = 'same-intent-diversity-user';
const personality = { humor: 80 } as any;
const state = {
  calmness: 75,
  anger: 5,
  stress: 15,
  happiness: 75,
  confidence: 75,
  surprise: 5,
  lastStatus: 'Sakin',
  reactionMode: 'neutral',
  relationship: {
    warmth: 85,
    trust: 85,
    hurtScore: 0,
    conflictScore: 0,
    familiarityDays: 40,
    interactionCount: 80,
  },
} as any;
const trace = { decision: { chosenTone: 'casual' } } as any;
const responsePlan = {
  move: 'natural_reaction',
  stance: 'open',
  register: 'casual',
  relationshipLevel: 'close',
  continueConversation: true,
  allowQuestion: true,
  allowHumor: true,
  allowAffection: true,
  allowForgiveness: false,
  allowReopeningCloseness: true,
  maxSentences: 2,
  maxWords: 24,
  emojiBudget: 1,
  reasons: [],
} as any;

beforeEach(() => {
  vi.useFakeTimers();
  const profile = getLanguageMemory(userId);
  profile.wordWeights = { kanka: 8, ya: 7, valla: 5, aynen: 5, he: 3, iyidir: 4, takılıyorum: 4, senden: 4 };
  profile.phraseWeights = {};
  profile.recentReplies = [];
  profile.interactionCount = 0;
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('same-intent local reply diversity', () => {
  it('keeps repeated how-are-you turns varied without immediate exact-repeat loops', () => {
    const replies: string[] = [];

    for (let i = 0; i < 15; i += 1) {
      const result = tryLocalKairoReply(
        'naber',
        personality,
        state,
        trace,
        userId,
        'natural_reaction',
        responsePlan,
        interpretSemanticEvent('naber'),
      );
      expect(result.handled).toBe(true);
      expect(result.intent).toBe('how_are_you');
      replies.push(result.reply || '');
    }

    expect(new Set(replies).size).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < replies.length; i += 1) {
      expect(replies[i]).not.toBe(replies[i - 1]);
    }
  });
});
