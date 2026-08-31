import { describe, expect, it, vi } from 'vitest';

const firestore = vi.hoisted(() => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...args: unknown[]) => ({ kind: 'collection', args })),
  doc: vi.fn((...args: unknown[]) => ({ kind: 'doc', args })),
  getDoc: firestore.getDoc,
  getDocs: firestore.getDocs,
  limit: vi.fn((value: number) => ({ kind: 'limit', value })),
  orderBy: vi.fn((...args: unknown[]) => ({ kind: 'orderBy', args })),
  query: vi.fn((...args: unknown[]) => ({ kind: 'query', args })),
  setDoc: firestore.setDoc,
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  where: vi.fn((...args: unknown[]) => ({ kind: 'where', args })),
}));

vi.mock('../lib/firebase', () => ({ db: { kind: 'mock-db' } }));

import type { DroitDynamicState } from '../types/nexus';
import { analyzeKdmInteraction } from './kdmConsistencyEngine';
import { loadTestSession, saveTestSessionTurn } from './kdmPersistenceService';

const messages = [
  'selam kaira',
  'naber',
  'Mert yarın istifa edeceğini söyledi',
  'haklı bence',
  'müdürle konuşacakmış',
  'teşekkürler',
  'bugün iş çok yoğundu',
  'neyse hallederiz',
  'salak mısın ya',
  'selam tekrar',
  'Mert yarın ne yapacaktı',
  'tamam',
  'dün biraz sert konuştum',
  'kusura bakma',
  'özür dilerim',
  'naber şimdi',
  'iyi geceler',
  'teşekkürler',
  'Mert ne yapacaktı hatırlıyor musun',
  'görüşürüz',
] as const;

describe('twenty-turn persistence roundtrip regression', () => {
  it('keeps every turn bound to its own after-state across save and hydration', async () => {
    let nowTick = new Date('2026-08-31T18:00:00.000Z').getTime();
    vi.spyOn(Date, 'now').mockImplementation(() => nowTick++);

    let state: DroitDynamicState | undefined;
    const expectedStates: DroitDynamicState[] = [];
    const savedTurns: Array<{ id: string; data: Record<string, any> }> = [];
    let latestSummary: Record<string, any> = {};
    let existingTurnCount = 0;

    firestore.getDoc.mockImplementation(async () => ({
      exists: () => existingTurnCount > 0,
      data: () => ({ turnCount: existingTurnCount }),
    }));
    firestore.setDoc.mockImplementation(async (_ref: unknown, data: Record<string, any>) => {
      if (typeof data?.turnNumber === 'number') {
        savedTurns.push({ id: String(data.turnId), data });
      } else if (data?.sessionId === 'mixed_quality_session') {
        latestSummary = { ...latestSummary, ...data };
      }
    });

    for (let index = 0; index < messages.length; index += 1) {
      const message = messages[index];
      const before = state ? structuredClone(state) : undefined;
      const result = analyzeKdmInteraction(message, undefined, state);
      state = result.nextDynamicState;
      expectedStates.push(structuredClone(state));

      const saved = await saveTestSessionTurn({
        sessionId: 'mixed_quality_session',
        userId: 'mixed_quality_user',
        userName: 'Ali',
        userMessage: message,
        assistantReply: `reply-${index + 1}`,
        reasoningTrace: result.trace,
        dynamicStateBefore: before,
        dynamicStateAfter: state,
        relationshipState: state.relationship,
        metadata: {
          providerUsed: index % 2 === 0 ? 'local_language' : 'openrouter',
          responsePlan: { turn: index + 1, move: index === 10 || index === 18 ? 'grounded_recall' : 'natural_reaction' },
          worldReasoningPolicy: { turn: index + 1 },
          worldMemoryGuard: { turn: index + 1 },
        },
      });

      expect(saved.turnNumber).toBe(index + 1);
      existingTurnCount = saved.turnNumber;
    }

    expect(savedTurns).toHaveLength(20);
    expect(new Set(savedTurns.map((turn) => turn.id)).size).toBe(20);
    expect(expectedStates).toHaveLength(20);

    firestore.getDoc.mockReset();
    firestore.getDocs.mockReset();
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => latestSummary,
    });
    firestore.getDocs.mockResolvedValue({
      docs: [...savedTurns].reverse().map((turn) => ({
        id: turn.id,
        data: () => turn.data,
      })),
    });

    const restored = await loadTestSession('mixed_quality_session');

    expect(restored).not.toBeNull();
    expect(restored?.turns).toHaveLength(20);
    expect(restored?.turns.map((turn) => turn.turnNumber)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );

    for (let index = 0; index < 20; index += 1) {
      expect(restored?.turns[index].dynamicStateAfter).toEqual(expectedStates[index]);
      expect(restored?.turns[index].metadata?.responsePlan).toEqual({
        turn: index + 1,
        move: index === 10 || index === 18 ? 'grounded_recall' : 'natural_reaction',
      });
    }

    expect(restored?.lastDynamicState).toEqual(expectedStates[19]);
    expect(restored?.lastResponsePlan).toEqual({ turn: 20, move: 'natural_reaction' });
    expect(restored?.lastWorldReasoningPolicy).toEqual({ turn: 20 });
    expect(restored?.lastWorldMemoryGuard).toEqual({ turn: 20 });
    expect(restored?.lastProviderUsed).toBe('openrouter');

    // Guard against the old measurement failure: hydrated turns must not all
    // collapse into the final state snapshot.
    const uniqueStateFingerprints = new Set(
      restored?.turns.map((turn) => JSON.stringify(turn.dynamicStateAfter)) ?? [],
    );
    expect(uniqueStateFingerprints.size).toBeGreaterThan(1);

    vi.restoreAllMocks();
  });
});
