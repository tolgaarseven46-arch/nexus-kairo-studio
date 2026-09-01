import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import type { DroitDynamicState } from '../types/nexus';

const serverSource = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');

const initialState: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: 'Sakin',
  reactionMode: 'neutral',
  relationship: {
    firstSeenAt: '2026-08-01T00:00:00.000Z',
    lastInteractionAt: '2026-09-01T00:00:00.000Z',
    interactionCount: 0,
    familiarityDays: 31,
    warmth: 60,
    trust: 60,
    positiveEvents: 0,
    negativeEvents: 0,
    conflictScore: 0,
    hurtScore: 0,
    repairProgress: 0,
    repeatedNegativeCount: 0,
    conversationState: 'active',
    repairAttempts: 0,
  },
};

const messages = [
  'naber',
  'bugün işler yoğundu',
  'tamam',
  'biraz moralim bozuk',
  'neyse devam',
  'salak',
  'özür dilerim',
  'tamam devam edelim',
  'bugün daha iyiyim',
  'sence ne yapalım',
  'teşekkür ederim',
  'naber yine',
  'çok yoruldum',
  'anladım',
  'bir şey soracağım',
  'bugün keyfim yerinde',
  'tamamdır',
  'niye böyle oldu',
  'hallederiz',
  'görüşürüz',
];

describe('real runtime per-turn KNT/state snapshots', () => {
  it('keeps all 20 turns as their own sequential before/after snapshots', () => {
    let state = initialState;
    const snapshots = messages.map((message, index) => {
      const before = JSON.parse(JSON.stringify(state)) as DroitDynamicState;
      const result = analyzeKdmInteraction(message, undefined, state);
      state = result.nextDynamicState;
      const after = JSON.parse(JSON.stringify(state)) as DroitDynamicState;
      return { turn: index + 1, message, before, after, trace: result.trace };
    });

    expect(snapshots).toHaveLength(20);
    for (let index = 0; index < snapshots.length; index += 1) {
      const snapshot = snapshots[index];
      expect(snapshot.turn).toBe(index + 1);
      expect(snapshot.trace.messageInterpretation.intent).toBeTruthy();
      expect(snapshot.after.relationship?.interactionCount).toBe(index + 1);
      if (index > 0) {
        expect(snapshot.before).toEqual(snapshots[index - 1].after);
      }
    }

    expect(new Set(snapshots.map((snapshot) => JSON.stringify(snapshot.after))).size).toBeGreaterThan(5);
    expect(snapshots[5].after).not.toEqual(snapshots[19].after);
  });

  it('wires runtime persistence to the state from that exact turn instead of the final session state', () => {
    expect(serverSource).toContain('saveKntTrace({');
    expect(serverSource).toContain('dynamicState: kdm.nextDynamicState');
    expect(serverSource).toContain('dynamicStateBefore: effective');
    expect(serverSource).toContain('dynamicStateAfter: kdm.nextDynamicState');
    expect(serverSource).toContain('reasoningTrace: kdm.trace');
  });
});
