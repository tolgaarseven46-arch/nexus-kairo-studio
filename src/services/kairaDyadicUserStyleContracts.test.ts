import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  dyadicLanguageAlignmentInstruction,
  dyadicLanguageStyleSignal,
  getLanguageMemory,
  observeUserLanguageStyle,
} from './kairoLanguageMemory';

const userId = 'dyadic-user-style-contract';

beforeEach(() => {
  const profile = getLanguageMemory(userId);
  profile.userMarkerWeights = {};
  profile.recentUserWordCounts = [];
  profile.userStyleInteractionCount = 0;
  profile.recentReplies = [];
  profile.phraseWeights = {};
  profile.interactionCount = 0;
});

// Dyadic alignment may shape HOW only; relationship and canonical behavior remain authoritative.
describe('dyadic user style projection contracts', () => {
  it('does not infer a stable style from one message', () => {
    observeUserLanguageStyle(userId, 'naber lan kanka');
    expect(dyadicLanguageStyleSignal(userId).maturity).toBe('cold');
    expect(dyadicLanguageAlignmentInstruction(userId, 'close')).toBe('');
  });

  it('learns only allowlisted HOW markers after repeated evidence', () => {
    for (let i = 0; i < 8; i += 1) observeUserLanguageStyle(userId, 'naber lan kanka aq salak');
    const signal = dyadicLanguageStyleSignal(userId);
    expect(signal.maturity).toBe('emerging');
    expect(signal.preferredMarkers).toContain('kanka');
    expect(signal.preferredMarkers).toContain('lan');
    expect(signal.preferredMarkers).not.toContain('aq');
    expect(signal.preferredMarkers).not.toContain('salak');
  });

  it('keeps relationship authority above alignment', () => {
    for (let i = 0; i < 8; i += 1) observeUserLanguageStyle(userId, 'lan kanka');
    expect(dyadicLanguageAlignmentInstruction(userId, 'new')).toBe('');
    expect(dyadicLanguageAlignmentInstruction(userId, 'familiar')).toContain('markerlar=kanka');
    expect(dyadicLanguageAlignmentInstruction(userId, 'familiar')).not.toContain('markerlar=lan');
    expect(dyadicLanguageAlignmentInstruction(userId, 'close')).toContain('lan');
  });

  it('does not observe or expose learned user style when memory policy is disabled', () => {
    observeUserLanguageStyle(userId, 'kanka kanka', false);
    expect(dyadicLanguageStyleSignal(userId, false)).toEqual({
      interactionCount: 0,
      maturity: 'cold',
      preferredMarkers: [],
      averageWords: 0,
      lengthPreference: 'very_short',
    });
  });

  it('wires user observation and the same HOW-only projection to AI and local verbalizers', () => {
    const server = readFileSync('server.ts', 'utf8');
    const local = readFileSync('src/services/kairoLocalLanguageEngine.ts', 'utf8');
    expect(server).toContain('observeUserLanguageStyle(stateUserId, userMessage, kairaPolicy.persistentUserMemory)');
    expect(server).toContain('dyadicLanguageAlignmentInstruction(stateUserId, speech.relationshipLevel, kairaPolicy.persistentUserMemory)');
    expect(local).toContain('useLearnedMemory,\n    relationshipLevel,');
  });

  it('keeps the projection HOW-only and subordinate to canonical behavior authorities', () => {
    const source = readFileSync('src/services/kairoLanguageMemory.ts', 'utf8');
    expect(source).toContain('KİŞİYE ÖZGÜ DİL UYUMU (HOW-ONLY, ÇOK DÜŞÜK OTORİTE)');
    expect(source).toContain('Küfür/hakaret, içerik, anı, duygu, niyet, ilişki sonucu veya davranış izni öğrenme/üretme');
    expect(source).toContain('ResponsePlan ve SpeechIdentity her zaman üstündür');
  });
});
