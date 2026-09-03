import { describe, expect, it } from 'vitest';
import type { DroitDynamicState } from '../types/nexus';
import { isCanonicalBehaviorFlagEnabled } from '../config/canonicalBehaviorFlags';
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
    const canonicalSemanticOn = isCanonicalBehaviorFlagEnabled('SEMANTIC_SCHEMA_V2');
    const canonicalReducerOn = isCanonicalBehaviorFlagEnabled('RELATIONSHIP_REDUCER_V2');
    const greeting = planDialogueResponse([], 'naber kanka', 'Mert');
    expect(greeting).toMatchObject({
      move: 'natural_reaction',
      allowFollowUpQuestion: true,
      allowSpeculation: false,
    });

    // Preserve the pre-ADR-0006 legacy acceptance fixture when semantic V2 is
    // OFF. Under SemanticInterpretation@2 a lone one-word insult is intentionally
    // ambiguous/candidate-only, so the canonical path uses an explicit target.
    const insultMessage = canonicalSemanticOn ? 'sen salaksın' : 'salak';
    const hurt = analyzeKdmInteraction(insultMessage, NEUTRAL_DROIT_PERSONALITY, closeRelationship);
    expect(hurt.nextDynamicState.reactionMode).toBe(canonicalReducerOn ? 'withdrawn' : 'hurt');
    const hurtSpeech = computeKairoSpeechIdentity(
      NEUTRAL_DROIT_PERSONALITY,
      hurt.nextDynamicState,
      hurt.trace,
    );
    expect(hurtSpeech.register).toBe('hurt');
    expect(hurtSpeech.sentenceLength).toBe('very_short');

    const firstRepair = analyzeKdmInteraction(
      'özür dilerim',
      NEUTRAL_DROIT_PERSONALITY,
      hurt.nextDynamicState,
    );
    expect(firstRepair.nextDynamicState.relationship?.repairProgress ?? 0)
      .toBeGreaterThan(hurt.nextDynamicState.relationship?.repairProgress ?? 0);

    const hurtBeforeRepair = hurt.nextDynamicState.relationship?.hurtScore ?? 0;
    const conflictBeforeRepair = hurt.nextDynamicState.relationship?.conflictScore ?? 0;
    const hurtAfterRepair = firstRepair.nextDynamicState.relationship?.hurtScore ?? 0;
    const conflictAfterRepair = firstRepair.nextDynamicState.relationship?.conflictScore ?? 0;
    if (canonicalReducerOn) {
      expect(hurtAfterRepair).toBeLessThanOrEqual(hurtBeforeRepair);
      expect(conflictAfterRepair).toBeLessThanOrEqual(conflictBeforeRepair);
    } else {
      expect(hurtAfterRepair).toBeLessThan(hurtBeforeRepair);
      expect(conflictAfterRepair).toBeLessThan(conflictBeforeRepair);
    }

    let state = firstRepair.nextDynamicState;
    let expectedInteractionCount = 92;
    if (canonicalReducerOn) {
      expect(state.reactionMode).toBe('withdrawn');
      expect(state.relationship?.conversationState).toBe('disengaged');

      const secondRepair = analyzeKdmInteraction(
        'gerçekten özür dilerim',
        NEUTRAL_DROIT_PERSONALITY,
        state,
      );
      expect(secondRepair.nextDynamicState.relationship?.repairProgress ?? 0)
        .toBeGreaterThan(state.relationship?.repairProgress ?? 0);
      expect(secondRepair.nextDynamicState.relationship?.conversationState).toBe('disengaged');
      expect(secondRepair.nextDynamicState.reactionMode).toBe('withdrawn');

      const thirdRepair = analyzeKdmInteraction(
        'özür dilerim, gerçekten hata ettim',
        NEUTRAL_DROIT_PERSONALITY,
        secondRepair.nextDynamicState,
      );
      expect(thirdRepair.nextDynamicState.relationship?.repairProgress ?? 0)
        .toBeGreaterThan(secondRepair.nextDynamicState.relationship?.repairProgress ?? 0);
      expect(thirdRepair.nextDynamicState.relationship?.conversationState).toBe('repairing');
      expect(thirdRepair.nextDynamicState.reactionMode).toBe('repairing');
      state = thirdRepair.nextDynamicState;
      expectedInteractionCount += 2;
    } else {
      expect(['repairing', 'neutral']).toContain(state.reactionMode);
    }

    for (let index = 0; index < 30; index += 1) {
      const message = index % 3 === 0 ? 'tamam devam edelim' : index % 3 === 1 ? 'naber' : 'bugün işler yoğundu';
      state = analyzeKdmInteraction(message, NEUTRAL_DROIT_PERSONALITY, state).nextDynamicState;
    }

    expect(state.reactionMode).toBe('neutral');
    expect(state.relationship?.conversationState).toBe('active');
    expect(state.relationship?.hurtScore ?? 100).toBeLessThan(5);
    expect(state.relationship?.conflictScore ?? 100).toBeLessThan(5);
    expect(state.relationship?.interactionCount).toBe(expectedInteractionCount);
  });
});
