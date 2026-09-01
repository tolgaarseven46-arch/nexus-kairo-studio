import { describe, expect, it } from 'vitest';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import { computeKairoSpeechIdentity } from './kairoSpeechIdentity';
import { NEUTRAL_DROIT_PERSONALITY } from './droitPersonalityNormalizer';
import type { DroitDynamicState } from '../types/nexus';

const base = (kind: 'new' | 'close' | 'damaged'): DroitDynamicState => {
  const relationship = kind === 'new'
    ? { familiarityDays: 0, interactionCount: 1, warmth: 50, trust: 50, conflictScore: 0, hurtScore: 0 }
    : kind === 'close'
      ? { familiarityDays: 35, interactionCount: 60, warmth: 80, trust: 80, conflictScore: 0, hurtScore: 0 }
      : { familiarityDays: 35, interactionCount: 60, warmth: 40, trust: 40, conflictScore: 30, hurtScore: 35 };
  return {
    calmness: 70,
    anger: 10,
    stress: 20,
    happiness: 70,
    confidence: 70,
    surprise: 10,
    lastStatus: 'Sakin',
    reactionMode: 'neutral',
    relationship: {
      firstSeenAt: '2026-07-01T00:00:00.000Z',
      lastInteractionAt: '2026-09-01T00:00:00.000Z',
      positiveEvents: kind === 'close' ? 20 : 0,
      negativeEvents: kind === 'damaged' ? 5 : 0,
      repairProgress: 0,
      repeatedNegativeCount: kind === 'damaged' ? 1 : 0,
      conversationState: 'active',
      repairAttempts: 0,
      ...relationship,
    },
  };
};

describe('qualitative reaction speech differentiation', () => {
  it('maps the same insult to distinct irritated, hurt and withdrawn HOW', () => {
    const fresh = analyzeKdmInteraction('salak', NEUTRAL_DROIT_PERSONALITY, base('new'));
    const close = analyzeKdmInteraction('salak', NEUTRAL_DROIT_PERSONALITY, base('close'));
    const damaged = analyzeKdmInteraction('salak', NEUTRAL_DROIT_PERSONALITY, base('damaged'));

    expect(fresh.nextDynamicState.reactionMode).toBe('irritated');
    expect(close.nextDynamicState.reactionMode).toBe('hurt');
    expect(damaged.nextDynamicState.reactionMode).toBe('withdrawn');

    const irritatedSpeech = computeKairoSpeechIdentity(NEUTRAL_DROIT_PERSONALITY, fresh.nextDynamicState, fresh.trace);
    const hurtSpeech = computeKairoSpeechIdentity(NEUTRAL_DROIT_PERSONALITY, close.nextDynamicState, close.trace);
    const withdrawnSpeech = computeKairoSpeechIdentity(NEUTRAL_DROIT_PERSONALITY, damaged.nextDynamicState, damaged.trace);

    expect(irritatedSpeech.register).toBe('firm');
    expect(hurtSpeech.register).toBe('hurt');
    expect(withdrawnSpeech.register).toBe('hurt');
    expect(irritatedSpeech.sentenceLength).not.toBe('very_short');
    expect(hurtSpeech.sentenceLength).toBe('very_short');
    expect(withdrawnSpeech.sentenceLength).toBe('very_short');
    expect(irritatedSpeech.instructions.join(' ')).toContain('Nitel tepki irritated');
    expect(hurtSpeech.instructions.join(' ')).toContain('Nitel tepki hurt');
    expect(withdrawnSpeech.instructions.join(' ')).toContain('Nitel tepki withdrawn');
  });

  it('uses controlled softening for repairing instead of hurt/firm carry-over', () => {
    const damaged = analyzeKdmInteraction('salak', NEUTRAL_DROIT_PERSONALITY, base('damaged'));
    const repair = analyzeKdmInteraction('özür dilerim', NEUTRAL_DROIT_PERSONALITY, damaged.nextDynamicState);
    expect(repair.nextDynamicState.reactionMode).toBe('repairing');

    const speech = computeKairoSpeechIdentity(NEUTRAL_DROIT_PERSONALITY, repair.nextDynamicState, repair.trace);
    expect(speech.register).toBe('balanced');
    expect(speech.instructions.join(' ')).toContain('Nitel tepki repairing');
    expect(speech.instructions.join(' ')).toContain('tamamen düzelmiş ilan etme');
  });
});
