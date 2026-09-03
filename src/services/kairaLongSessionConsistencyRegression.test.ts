import { describe, expect, it } from 'vitest';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import type { DroitDynamicState } from '../types/nexus';

const start: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: 'Sakin ve kontrollü',
  reactionMode: 'neutral',
  relationship: {
    firstSeenAt: '2026-08-01T00:00:00.000Z',
    lastInteractionAt: '2026-09-01T00:00:00.000Z',
    interactionCount: 40,
    familiarityDays: 31,
    warmth: 72,
    trust: 72,
    positiveEvents: 12,
    negativeEvents: 0,
    conflictScore: 0,
    hurtScore: 0,
    repairProgress: 0,
    repeatedNegativeCount: 0,
    conversationState: 'active',
    repairAttempts: 0,
  },
};

const bounded = (value: number | undefined) => {
  expect(Number.isFinite(value)).toBe(true);
  expect(value ?? -1).toBeGreaterThanOrEqual(0);
  expect(value ?? 101).toBeLessThanOrEqual(100);
};

describe('long-session consistency', () => {
  it('keeps 120 mixed turns bounded, sequential and recoverable without stale qualitative drift', () => {
    let state = start;
    const snapshots: DroitDynamicState[] = [];
    const messages: string[] = [];

    for (let i = 0; i < 120; i += 1) {
      let message = i % 3 === 0 ? 'naber' : i % 3 === 1 ? 'bugün işler yoğundu' : 'tamam';
      if (i === 25 || i === 55) message = 'sen salaksın';
      if (i === 26 || i === 56) message = 'özür dilerim';
      if (i === 27 || i === 57) message = 'tamam devam edelim';
      messages.push(message);
      const previous = state;
      const result = analyzeKdmInteraction(message, undefined, previous);
      state = result.nextDynamicState;
      snapshots.push(JSON.parse(JSON.stringify(state)));

      bounded(state.calmness);
      bounded(state.anger);
      bounded(state.stress);
      bounded(state.happiness);
      bounded(state.confidence);
      bounded(state.surprise);
      bounded(state.relationship?.warmth);
      bounded(state.relationship?.trust);
      bounded(state.relationship?.conflictScore);
      bounded(state.relationship?.hurtScore);
      bounded(state.relationship?.repairProgress);
      expect(state.relationship?.interactionCount).toBe(41 + i);
      expect(previous).not.toBe(state);
    }

    expect(messages).toHaveLength(120);
    expect(snapshots).toHaveLength(120);
    expect(snapshots[25].reactionMode).not.toBe('neutral');
    expect(snapshots[26].relationship?.hurtScore ?? 0)
      .toBeLessThanOrEqual(snapshots[25].relationship?.hurtScore ?? 0);
    expect(snapshots[26].relationship?.conflictScore ?? 0)
      .toBeLessThanOrEqual(snapshots[25].relationship?.conflictScore ?? 0);
    expect(['neutral', 'repairing']).toContain(snapshots[26].reactionMode);
    expect(state.reactionMode).toBe('neutral');
    expect(state.relationship?.conversationState).toBe('active');
    expect(state.relationship?.hurtScore ?? 100).toBeLessThan(5);
    expect(state.relationship?.conflictScore ?? 100).toBeLessThan(5);
    expect(new Set(snapshots.map((item) => JSON.stringify(item))).size).toBeGreaterThan(20);
  });
});
