import { afterEach, describe, expect, it } from 'vitest';
import type { DroitDynamicState } from '../types/nexus';
import type { CanonicalBehaviorFlag } from '../config/canonicalBehaviorFlags';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import { NEUTRAL_DROIT_PERSONALITY } from './droitPersonalityNormalizer';

const FLAGS: CanonicalBehaviorFlag[] = [
  'SEMANTIC_SCHEMA_V2',
  'RELATIONSHIP_REDUCER_V2',
  'PLAN_RESOLVER_V2',
  'CANONICAL_PROMPT_BUILDER',
  'UNIFIED_GUARD_PASS',
];

const originalEnv = Object.fromEntries(FLAGS.map((flag) => [flag, process.env[flag]]));

afterEach(() => {
  for (const flag of FLAGS) {
    const value = originalEnv[flag];
    if (value === undefined) delete process.env[flag];
    else process.env[flag] = value;
  }
});

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

function setCanonical(enabled: boolean) {
  for (const flag of FLAGS) process.env[flag] = enabled ? '1' : '0';
}

function run(message: string, state: DroitDynamicState = closeRelationship) {
  return analyzeKdmInteraction(message, NEUTRAL_DROIT_PERSONALITY, state).nextDynamicState;
}

function compare(message: string) {
  setCanonical(false);
  const legacy = run(message);
  setCanonical(true);
  const canonical = run(message);
  return { legacy, canonical };
}

describe('canonical vs legacy shared-corpus diff review', () => {
  it('keeps ordinary neutral social input behaviorally aligned', () => {
    const { legacy, canonical } = compare('naber');

    expect(legacy.reactionMode).toBe('neutral');
    expect(canonical.reactionMode).toBe('neutral');
    expect(legacy.relationship?.conversationState).toBe('active');
    expect(canonical.relationship?.conversationState).toBe('active');
  });

  it('records the intentional one-word-insult semantic downgrade in V2', () => {
    const { legacy, canonical } = compare('salak');

    // Explained delta: the legacy parser treated this lexical hit as a direct
    // injury; SemanticInterpretation@2 deliberately keeps a one-word slur as an
    // uncorroborated candidate instead of inventing the target.
    expect(legacy.reactionMode).toBe('hurt');
    expect(canonical.reactionMode).toBe('neutral');
    expect(legacy.relationship?.conversationState).toBe('active');
    expect(canonical.relationship?.conversationState).toBe('active');
  });

  it('records the intentional explicit-target upgrade and canonical hard boundary', () => {
    const { legacy, canonical } = compare('sen salaksın');

    // Explained delta: the historical lexical matcher did not promote this
    // multi-word form, while V2 has independent second-person target evidence.
    // The canonical reducer therefore owns the hard boundary and withdraws.
    expect(legacy.reactionMode).toBe('neutral');
    expect(legacy.relationship?.conversationState).toBe('active');
    expect(canonical.reactionMode).toBe('withdrawn');
    expect(canonical.relationship?.conversationState).toBe('disengaged');
  });

  it('records staged canonical repair without allowing a permanent hard-boundary lock', () => {
    setCanonical(false);
    const legacyInjury = run('sen salaksın');
    const legacyRepair = run('özür dilerim', legacyInjury);

    setCanonical(true);
    const canonicalInjury = run('sen salaksın');
    const canonicalRepair1 = run('özür dilerim', canonicalInjury);
    const canonicalRepair2 = run('gerçekten özür dilerim', canonicalRepair1);
    const canonicalRepair3 = run('özür dilerim, gerçekten hata ettim', canonicalRepair2);

    // Legacy has no hard boundary for this shared explicit-target input.
    expect(legacyInjury.relationship?.conversationState).toBe('active');
    expect(legacyRepair.relationship?.conversationState).toBe('active');

    // Canonical hard-boundary repair is deliberately cumulative/config-driven.
    expect(canonicalInjury.relationship?.conversationState).toBe('disengaged');
    expect(canonicalRepair1.relationship?.conversationState).toBe('disengaged');
    expect(canonicalRepair2.relationship?.conversationState).toBe('disengaged');
    expect(canonicalRepair3.relationship?.conversationState).toBe('repairing');
    expect(canonicalRepair1.relationship?.repairProgress ?? 0).toBeGreaterThan(0);
    expect(canonicalRepair2.relationship?.repairProgress ?? 0)
      .toBeGreaterThan(canonicalRepair1.relationship?.repairProgress ?? 0);
    expect(canonicalRepair3.relationship?.repairProgress ?? 0)
      .toBeGreaterThan(canonicalRepair2.relationship?.repairProgress ?? 0);
  });
});
