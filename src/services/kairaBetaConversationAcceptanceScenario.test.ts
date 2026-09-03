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
  it('keeps canonical social continuity, hard-boundary repair and long-session recovery coherent', () => {
    const greeting = planDialogueResponse([], 'naber kanka', 'Mert');
    expect(greeting).toMatchObject({
      move: 'natural_reaction',
      allowFollowUpQuestion: true,
      allowSpeculation: false,
    });

    // SemanticInterpretation@2 requires explicit target evidence for this injury.
    const hurt = analyzeKdmInteraction('sen salaksın', NEUTRAL_DROIT_PERSONALITY, closeRelationship);
    expect(hurt.nextDynamicState.reactionMode).toBe('withdrawn');
    expect(hurt.nextDynamicState.relationship?.conversationState).toBe('disengaged');
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
    expect(firstRepair.nextDynamicState.relationship?.hurtScore ?? 0)
      .toBeLessThanOrEqual(hurt.nextDynamicState.relationship?.hurtScore ?? 0);
    expect(firstRepair.nextDynamicState.relationship?.conflictScore ?? 0)
      .toBeLessThanOrEqual(hurt.nextDynamicState.relationship?.conflictScore ?? 0);
    expect(firstRepair.nextDynamicState.reactionMode).toBe('withdrawn');
    expect(firstRepair.nextDynamicState.relationship?.conversationState).toBe('disengaged');

    const secondRepair = analyzeKdmInteraction(
      'gerçekten özür dilerim',
      NEUTRAL_DROIT_PERSONALITY,
      firstRepair.nextDynamicState,
    );
    expect(secondRepair.nextDynamicState.relationship?.repairProgress ?? 0)
      .toBeGreaterThan(firstRepair.nextDynamicState.relationship?.repairProgress ?? 0);
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

    let state = thirdRepair.nextDynamicState;
    for (let index = 0; index < 30; index += 1) {
      const message = index % 3 === 0 ? 'tamam devam edelim' : index % 3 === 1 ? 'naber' : 'bugün işler yoğundu';
      state = analyzeKdmInteraction(message, NEUTRAL_DROIT_PERSONALITY, state).nextDynamicState;
    }

    expect(state.reactionMode).toBe('neutral');
    expect(state.relationship?.conversationState).toBe('active');
    expect(state.relationship?.hurtScore ?? 100).toBeLessThan(5);
    expect(state.relationship?.conflictScore ?? 100).toBeLessThan(5);
    expect(state.relationship?.interactionCount).toBe(94);
  });
});
