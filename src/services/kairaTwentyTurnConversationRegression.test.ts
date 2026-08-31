import { describe, expect, it } from 'vitest';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import type { DroitDynamicState } from '../types/nexus';

const messages = [
  'selam kaira',
  'naber',
  'ben öğrenciyim',
  'bugün iş çok yoğundu',
  'yine bütün işi son dakikaya bıraktım haha',
  'neyse hallederiz',
  'hiç havamda değilim',
  'biraz kafam bozuk',
  'boşver geçer',
  'salak mısın ya',
  'neyse tamam',
  'bugün hava sakin',
  'ben biraz dinlenicem',
  'sonra konuşuruz',
  'selam tekrar',
  'dün biraz sert konuştum',
  'kusura bakma',
  'özür dilerim',
  'tamamdır',
  'naber şimdi',
];

describe('20-turn real stateful conversation regression', () => {
  it('carries each turn from its own prior state without mutating earlier snapshots', () => {
    let state: DroitDynamicState | undefined;
    const states: DroitDynamicState[] = [];
    const frozenJson: string[] = [];

    for (const message of messages) {
      const result = analyzeKdmInteraction(message, undefined, state);
      state = result.nextDynamicState;
      states.push(state);
      frozenJson.push(JSON.stringify(state));
    }

    expect(states).toHaveLength(20);
    expect(new Set(states.map((item) => item)).size).toBe(20);

    // Re-serialize all historical objects after the full run. If the engine mutated
    // an earlier state in-place, at least one of these values would have changed.
    expect(states.map((item) => JSON.stringify(item))).toEqual(frozenJson);

    const relationshipSnapshots = states.map((item) => JSON.stringify(item.relationship ?? {}));
    expect(new Set(relationshipSnapshots).size).toBeGreaterThanOrEqual(6);

    const interactionCounts = states.map((item) => Number(item.relationship?.interactionCount ?? 0));
    for (let index = 1; index < interactionCounts.length; index += 1) {
      expect(interactionCounts[index]).toBeGreaterThanOrEqual(interactionCounts[index - 1]);
    }
    expect(interactionCounts.at(-1)).toBeGreaterThan(interactionCounts[0]);
  });

  it('preserves qualitative reaction continuity across the insult and immediate neutral follow-up', () => {
    let state: DroitDynamicState | undefined;
    const states: DroitDynamicState[] = [];

    for (const message of messages) {
      const result = analyzeKdmInteraction(message, undefined, state);
      state = result.nextDynamicState;
      states.push(state);
    }

    const insultTurn = states[9];
    const immediateNeutralTurn = states[10];
    const laterRepairTurns = states.slice(15, 19);

    expect(insultTurn.reactionMode).not.toBe('neutral');
    expect(immediateNeutralTurn.reactionMode).not.toBe('neutral');
    expect(Number(immediateNeutralTurn.relationship?.hurtScore ?? 0)).toBeLessThanOrEqual(
      Number(insultTurn.relationship?.hurtScore ?? 0),
    );

    // Apology/repair must move the qualitative state toward repair/neutral rather
    // than silently restoring the exact pre-insult state in one step.
    expect(laterRepairTurns.some((turn) => turn.reactionMode === 'repairing' || turn.reactionMode === 'neutral')).toBe(true);
  });
});
