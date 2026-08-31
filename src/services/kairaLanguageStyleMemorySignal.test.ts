import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLanguageMemory,
  languageStyleMemoryInstruction,
  languageStyleMemorySignal,
  learnLanguageReply,
} from './kairoLanguageMemory';

const userId = 'language-style-memory-signal-user';

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

describe('learned language HOW signal', () => {
  it('stays silent before enough accepted examples exist', () => {
    learnLanguageReply(userId, 'proje bugün zorladı kanka ya');
    learnLanguageReply(userId, 'proje yine zorladı kanka ya');

    expect(languageStyleMemorySignal(userId).maturity).toBe('cold');
    expect(languageStyleMemoryInstruction(userId)).toBe('');
  });

  it('derives only safe HOW statistics and never replays content or raw phrases', () => {
    learnLanguageReply(userId, 'proje bugün zorladı kanka ya');
    learnLanguageReply(userId, 'proje yine zorladı kanka ya');
    learnLanguageReply(userId, 'sunucu tarafı da uzadı be');
    learnLanguageReply(userId, 'valla baya uğraştırdı be');

    const signal = languageStyleMemorySignal(userId);
    const instruction = languageStyleMemoryInstruction(userId);

    expect(signal.maturity).toBe('emerging');
    expect(signal.preferredMarkers).toContain('kanka');
    expect(signal.preferredMarkers).toContain('ya');
    expect(signal.preferredMarkers).toContain('be');
    expect(signal.averageWords).toBeGreaterThan(0);
    expect(instruction).toContain('HOW-ONLY');
    expect(instruction).toContain('ResponsePlan');
    expect(instruction).toContain('SpeechIdentity');
    expect(instruction).not.toContain('proje');
    expect(instruction).not.toContain('sunucu');
    expect(instruction).not.toContain('zorladı');
    expect(instruction).not.toContain('uğraştırdı');
  });

  it('does not promote a one-off discourse marker as a learned preference', () => {
    learnLanguageReply(userId, 'cidden proje uzadı');
    learnLanguageReply(userId, 'başka bir cevap');
    learnLanguageReply(userId, 'bir cevap daha');

    expect(languageStyleMemorySignal(userId).preferredMarkers).not.toContain('cidden');
  });

  it('counts repeated marker tokens in one reply as one evidence observation', () => {
    learnLanguageReply(userId, 'cidden cidden proje uzadı');
    learnLanguageReply(userId, 'başka bir cevap');
    learnLanguageReply(userId, 'bir cevap daha');

    expect(languageStyleMemorySignal(userId).maturity).toBe('emerging');
    expect(languageStyleMemorySignal(userId).preferredMarkers).not.toContain('cidden');

    learnLanguageReply(userId, 'cidden bu da uzadı');
    expect(languageStyleMemorySignal(userId).preferredMarkers).toContain('cidden');
  });
});
