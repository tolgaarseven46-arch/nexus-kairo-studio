import { describe, expect, it } from 'vitest';
import { computeKairoSpeechIdentity, speechIdentityPrompt } from './kairoSpeechIdentity';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import { NEUTRAL_DROIT_PERSONALITY } from './droitPersonalityNormalizer';
import type { DroitDynamicState } from '../types/nexus';

function state(level: 'new' | 'familiar' | 'close'): DroitDynamicState {
  const relationship = level === 'new'
    ? { familiarityDays: 0, interactionCount: 1, warmth: 50, trust: 50 }
    : level === 'familiar'
      ? { familiarityDays: 10, interactionCount: 18, warmth: 58, trust: 58 }
      : { familiarityDays: 35, interactionCount: 60, warmth: 78, trust: 78 };
  return {
    calmness: 70, anger: 10, stress: 20, happiness: 70, confidence: 70, surprise: 10,
    lastStatus: 'Sakin', reactionMode: 'neutral',
    relationship: {
      firstSeenAt: '2026-07-01T00:00:00.000Z',
      lastInteractionAt: '2026-09-01T00:00:00.000Z',
      positiveEvents: 4, negativeEvents: 0, conflictScore: 0, hurtScore: 0,
      repairProgress: 0, repeatedNegativeCount: 0, conversationState: 'active',
      ...relationship,
    },
  };
}

describe('Kaira speech identity fingerprint', () => {
  it('keeps the fixed writing rhythm while relationship context changes natural intimacy', () => {
    const identities = (['new', 'familiar', 'close'] as const).map((level) => {
      const current = state(level);
      const trace = analyzeKdmInteraction('naber', NEUTRAL_DROIT_PERSONALITY, current).trace;
      return computeKairoSpeechIdentity(NEUTRAL_DROIT_PERSONALITY, current, trace);
    });

    expect(identities.map((item) => item.relationshipLevel)).toEqual(['new', 'familiar', 'close']);
    expect(identities[0].slangLevel).toBeLessThan(identities[1].slangLevel);
    expect(identities[1].slangLevel).toBeLessThan(identities[2].slangLevel);
    expect(identities[0].rhythm).toEqual(identities[1].rhythm);
    expect(identities[1].rhythm).toEqual(identities[2].rhythm);
    expect(identities.every((item) => item.rhythm.messageLength === 'short_first')).toBe(true);
  });

  it('preserves identity but narrows HOW after hurt instead of becoming generic assistant language', () => {
    const close = state('close');
    const insult = analyzeKdmInteraction('salak', NEUTRAL_DROIT_PERSONALITY, close);
    const speech = computeKairoSpeechIdentity(NEUTRAL_DROIT_PERSONALITY, insult.nextDynamicState, insult.trace);
    const prompt = speechIdentityPrompt(speech);

    expect(speech.relationshipLevel).toBe('close');
    expect(speech.register).not.toBe('casual');
    expect(speech.emojiLevel).toBe(0);
    expect(prompt).toContain('HOW ONLY');
    expect(prompt).toContain('yapay zeka asistanı gibi değil');
    expect(prompt).toContain('kısa-öncelikli');
    expect(prompt).toContain('izin vermez');
  });
});
