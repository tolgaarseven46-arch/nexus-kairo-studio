import { describe, expect, it } from 'vitest';
import type { DroitDynamicState } from '../types/nexus';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import { planDialogueResponse } from './kairoDialogueDecisionEngine';
import { computeKairoSpeechIdentity } from './kairoSpeechIdentity';
import { NEUTRAL_DROIT_PERSONALITY } from './droitPersonalityNormalizer';

const closeRelationship: DroitDynamicState = {
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
    familiarityDays: 35,
    interactionCount: 60,
    warmth: 80,
    trust: 80,
    positiveEvents: 20,
    negativeEvents: 0,
    conflictScore: 0,
    hurtScore: 0,
    repairProgress: 0,
    repeatedNegativeCount: 0,
    conversationState: 'active',
    repairAttempts: 0,
  },
};

describe('beta conversation acceptance scenario', () => {
  it('keeps social continuity, relationship-sensitive reaction, repair and long-session recovery coherent', () => {
    const greeting = planDialogueResponse([], 'naber kanka', 'Mert');
    expect(greeting).toMatchObject({
      move: 'natural_reaction',
      allowFollowUpQuestion: true,
      allowSpeculation: false,
    });

    // Use an explicitly targeted insult. A lone one-word insult such as "salak"
    // is intentionally ambiguous under SemanticInterpretation@2 and remains a
    // candidate signal instead of being forced into a Kaira-directed injury.
    const hurt = analyzeKdmInteraction('sen salaksın', NEUTRAL_DROIT_PERSONALITY, closeRelationship);
    expect(hurt.nextDynamicState.reactionMode).toBe('hurt');
    const hurtSpeech = computeKairoSpeechIdentity(
      NEUTRAL_DROIT_PERSONALITY,
      hurt.nextDynamicState,
      hurt.trace,
    );
    expect(hurtSpeech.register).toBe('hurt');
    expect(hurtSpeech.sentenceLength).toBe('very_short');

    const repair = analyzeKdmInteraction(
      'özür dilerim',
      NEUTRAL_DROIT_PERSONALITY,
      hurt.nextDynamicState,
    );
    // Close relationships may settle directly back to neutral after an accepted apology;
    // the durable acceptance invariant is that repair progresses and damage decreases.
    expect(['repairing', 'neutral']).toContain(repair.nextDynamicState.reactionMode);
    expect(repair.nextDynamicState.relationship?.repairProgress ?? 0)
      .toBeGreaterThan(hurt.nextDynamicState.relationship?.repairProgress ?? 0);
    expect(repair.nextDynamicState.relationship?.hurtScore ?? 100)
      .toBeLessThan(hurt.nextDynamicState.relationship?.hurtScore ?? 0);
    expect(repair.nextDynamicState.relationship?.conflictScore ?? 100)
      .toBeLessThan(hurt.nextDynamicState.relationship?.conflictScore ?? 0);

    let state = repair.nextDynamicState;
    for (let index = 0; index < 30; index += 1) {
      const message = index % 3 === 0 ? 'tamam devam edelim' : index % 3 === 1 ? 'naber' : 'bugün işler yoğundu';
      state = analyzeKdmInteraction(message, NEUTRAL_DROIT_PERSONALITY, state).nextDynamicState;
    }

    expect(state.reactionMode).toBe('neutral');
    expect(state.relationship?.conversationState).toBe('active');
    expect(state.relationship?.hurtScore ?? 100).toBeLessThan(5);
    expect(state.relationship?.conflictScore ?? 100).toBeLessThan(5);
    expect(state.relationship?.interactionCount).toBe(92);
  });
});
