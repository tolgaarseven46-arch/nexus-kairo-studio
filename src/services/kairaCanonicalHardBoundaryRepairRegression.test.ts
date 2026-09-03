import { describe, expect, it } from 'vitest';
import { reduceRelationshipTurn, type RelationshipReducerInput } from './relationshipReducer';
import { EMPTY_SEVERITY_VECTOR } from '../types/semanticInterpretation';

const signal = (apology: boolean) => ({
  valence: apology ? ('positive' as const) : ('neutral' as const),
  targetsKaira: false,
  severity: { ...EMPTY_SEVERITY_VECTOR },
  jokingConfidence: 0,
  sincerityConfidence: 0.9,
  apology,
  repairAttempt: false,
  support: 0,
  compliment: 0,
  affection: 0,
  userStop: false,
  uncertainty: 0.2,
  negativePattern: null,
});

function disengaged(repairProgress = 0, repairAttempts = 0): RelationshipReducerInput['prev'] {
  return {
    scores: {
      warmth: 74,
      trust: 76,
      conflict: 4,
      hurt: 5,
      repairProgress,
      positiveEvents: 20,
      negativeEvents: 1,
      repeatedNegativeCount: 1,
      familiarity: 0.9,
    },
    conversationState: 'disengaged',
    reactionMode: 'withdrawn',
    affect: { anger: 11, stress: 24, happiness: 67, calmness: 68 },
    firstSeenAt: '2026-07-01T00:00:00.000Z',
    lastInteractionAt: '2026-09-03T12:00:00.000Z',
    lastConflictAt: '2026-09-03T12:00:00.000Z',
    lastNegativePattern: 'hakaret',
    disengagedAt: '2026-09-03T12:00:00.000Z',
    disengageReason: 'combined_boundary_violation',
    boundarySetByKaira: true,
    repairAttempts,
    interactionCount: 61,
  };
}

describe('canonical hard-boundary repair regression', () => {
  it('does not deadlock repair when good-history damping leaves numeric injury below repairInjuryFloor', () => {
    const first = reduceRelationshipTurn({
      prev: disengaged(),
      signal: signal(true),
      timing: { elapsedMinutesSincePrev: 0, nowIso: '2026-09-03T12:01:00.000Z' },
    });

    expect(first.scores.conflict).toBeLessThan(6);
    expect(first.scores.hurt).toBeLessThan(6);
    expect(first.scores.repairProgress).toBeGreaterThan(0);
    expect(first.conversationState).toBe('disengaged');
    expect(first.reactionMode).toBe('withdrawn');

    const second = reduceRelationshipTurn({
      prev: {
        ...disengaged(first.scores.repairProgress, first.repairAttempts),
        scores: first.scores,
        interactionCount: first.interactionCount,
      },
      signal: signal(true),
      timing: { elapsedMinutesSincePrev: 0, nowIso: '2026-09-03T12:02:00.000Z' },
    });

    expect(second.scores.repairProgress).toBeGreaterThan(first.scores.repairProgress);
    expect(second.conversationState).toBe('repairing');
    expect(second.reactionMode).toBe('repairing');
  });

  it('still does not accumulate fake repair on an active relationship with zero injury', () => {
    const result = reduceRelationshipTurn({
      prev: {
        ...disengaged(),
        scores: { ...disengaged().scores, conflict: 0, hurt: 0, repairProgress: 0 },
        conversationState: 'active',
        reactionMode: 'neutral',
        disengageReason: undefined,
        disengagedAt: undefined,
        boundarySetByKaira: false,
      },
      signal: signal(true),
      timing: { elapsedMinutesSincePrev: 0, nowIso: '2026-09-03T12:01:00.000Z' },
    });

    expect(result.scores.repairProgress).toBe(0);
    expect(result.conversationState).toBe('active');
  });
});
