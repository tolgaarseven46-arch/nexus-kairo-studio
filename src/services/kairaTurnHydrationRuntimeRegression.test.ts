import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { loadTestSession, saveTestSessionTurn } from './kdmPersistenceService';

const olderState = {
  calmness: 48,
  anger: 38,
  stress: 46,
  happiness: 42,
  confidence: 60,
  surprise: 10,
  lastStatus: 'Kırgın',
  reactionMode: 'hurt' as const,
  relationship: {
    firstSeenAt: '2026-08-01T10:00:00.000Z',
    lastInteractionAt: '2026-08-31T18:00:00.000Z',
    interactionCount: 9,
    familiarityDays: 30,
    warmth: 49,
    trust: 53,
    positiveEvents: 2,
    negativeEvents: 2,
    conflictScore: 24,
    hurtScore: 32,
    repairProgress: 0,
    repeatedNegativeCount: 1,
    conversationState: 'distancing' as const,
  },
};

const latestState = {
  calmness: 63,
  anger: 20,
  stress: 31,
  happiness: 56,
  confidence: 64,
  surprise: 8,
  lastStatus: 'Onarılıyor',
  reactionMode: 'repairing' as const,
  relationship: {
    firstSeenAt: '2026-08-01T10:00:00.000Z',
    lastInteractionAt: '2026-08-31T18:05:00.000Z',
    interactionCount: 10,
    familiarityDays: 30,
    warmth: 55,
    trust: 56,
    positiveEvents: 3,
    negativeEvents: 2,
    conflictScore: 16,
    hurtScore: 20,
    repairProgress: 45,
    repeatedNegativeCount: 1,
    conversationState: 'repairing' as const,
    repairAttempts: 1,
  },
};

const latestResponsePlan = {
  move: 'natural_reaction',
  stance: 'repairing-cautious',
  register: 'balanced',
  relationshipLevel: 'new',
  continueConversation: true,
  allowQuestion: false,
  allowHumor: false,
  allowAffection: false,
  allowForgiveness: false,
  allowReopeningCloseness: false,
  maxSentences: 1,
  maxWords: 14,
  emojiBudget: 0,
  reasons: ['repairing state'],
};

const latestWorldStateAppraisal = {
  evidenceCount: 1,
  hasReportedAttribution: true,
};
const latestWorldReasoningPolicy = {
  mustPreserveReportedAttribution: true,
};
const latestWorldMemoryGuard = {
  changed: true,
  issues: ['reported_attribution_repaired'],
};

describe('runtime test-session turn hydration regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores chronological turn-local state and observability without session-summary overwrite', async () => {
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        userId: 'mixed_quality_user',
        userName: 'Ali',
        characterId: 'kairo',
        createdAt: '2026-08-31T17:55:00.000Z',
        updatedAt: '2026-08-31T18:05:00.000Z',
        // Deliberately stale summary state: last turn must win during hydration.
        dynamicState: olderState,
        relationship: olderState.relationship,
        active: true,
      }),
    });

    firestore.getDocs.mockResolvedValue({
      docs: [
        {
          id: 'turn_10',
          data: () => ({
            turnNumber: 10,
            timestamp: '2026-08-31T18:05:00.000Z',
            userMessage: 'özür dilerim',
            assistantReply: 'tamam, anladım',
            speaker: 'Ali',
            intent: 'repair',
            detectedEmotion: 'özür',
            dynamicStateBefore: olderState,
            dynamicStateAfter: latestState,
            relationshipState: latestState.relationship,
            metadata: {
              providerUsed: 'openrouter',
              timings: { total: 120 },
              worldStateAppraisal: latestWorldStateAppraisal,
              worldReasoningPolicy: latestWorldReasoningPolicy,
              worldMemoryGuard: latestWorldMemoryGuard,
              responsePlan: latestResponsePlan,
            },
          }),
        },
        {
          id: 'turn_9',
          data: () => ({
            turnNumber: 9,
            timestamp: '2026-08-31T18:00:00.000Z',
            userMessage: 'selam tekrar',
            assistantReply: 'selam',
            speaker: 'Ali',
            intent: 'greeting',
            detectedEmotion: 'nötr',
            dynamicStateBefore: olderState,
            dynamicStateAfter: olderState,
            relationshipState: olderState.relationship,
            metadata: {
              providerUsed: 'local_language',
              responsePlan: { move: 'natural_reaction', continueConversation: true },
            },
          }),
        },
      ],
    });

    const restored = await loadTestSession('mixed_quality_session');

    expect(restored).not.toBeNull();
    expect(restored?.turns.map((turn) => turn.turnNumber)).toEqual([9, 10]);
    expect(restored?.turns[1].dynamicStateAfter?.reactionMode).toBe('repairing');
    expect(restored?.turns[1].dynamicStateAfter?.relationship?.conversationState).toBe('repairing');
    expect(restored?.turns[1].dynamicStateAfter?.relationship?.repairAttempts).toBe(1);

    expect(restored?.lastDynamicState).toEqual(latestState);
    expect(restored?.lastDynamicState).not.toEqual(olderState);
    expect(restored?.lastResponsePlan).toEqual(latestResponsePlan);
    expect(restored?.lastWorldStateAppraisal).toEqual(latestWorldStateAppraisal);
    expect(restored?.lastWorldReasoningPolicy).toEqual(latestWorldReasoningPolicy);
    expect(restored?.lastWorldMemoryGuard).toEqual(latestWorldMemoryGuard);
    expect(restored?.lastProviderUsed).toBe('openrouter');
    expect(restored?.lastTimings).toEqual({ total: 120 });
  });

  it('round-trips canonical turn state and observability through the Firestore payload shape', async () => {
    firestore.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ turnCount: 9 }),
    });
    firestore.setDoc.mockResolvedValue(undefined);

    const saved = await saveTestSessionTurn({
      sessionId: 'mixed_quality_session',
      userId: 'mixed_quality_user',
      userName: 'Ali',
      userMessage: 'özür dilerim',
      assistantReply: 'tamam, anladım',
      intent: 'repair',
      detectedEmotion: 'özür',
      dynamicStateBefore: olderState,
      dynamicStateAfter: latestState,
      relationshipState: latestState.relationship,
      metadata: {
        providerUsed: 'openrouter',
        timings: { total: 120 },
        worldStateAppraisal: latestWorldStateAppraisal,
        worldReasoningPolicy: latestWorldReasoningPolicy,
        worldMemoryGuard: latestWorldMemoryGuard,
        responsePlan: latestResponsePlan,
      },
    });

    expect(saved.turnNumber).toBe(10);
    expect(firestore.setDoc).toHaveBeenCalledTimes(2);

    const persistedTurn = firestore.setDoc.mock.calls[0][1];
    const persistedSummary = firestore.setDoc.mock.calls[1][1];

    expect(persistedTurn.dynamicStateAfter).toEqual(latestState);
    expect(persistedTurn.metadata.responsePlan).toEqual(latestResponsePlan);
    expect(persistedTurn.metadata.worldReasoningPolicy).toEqual(latestWorldReasoningPolicy);
    expect(persistedTurn.metadata.worldMemoryGuard).toEqual(latestWorldMemoryGuard);

    firestore.getDoc.mockReset();
    firestore.getDocs.mockReset();
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => persistedSummary,
    });
    firestore.getDocs.mockResolvedValue({
      docs: [{ id: saved.turnId, data: () => persistedTurn }],
    });

    const restored = await loadTestSession('mixed_quality_session');

    expect(restored?.turns).toHaveLength(1);
    expect(restored?.turns[0].turnNumber).toBe(10);
    expect(restored?.lastDynamicState).toEqual(latestState);
    expect(restored?.lastResponsePlan).toEqual(latestResponsePlan);
    expect(restored?.lastWorldStateAppraisal).toEqual(latestWorldStateAppraisal);
    expect(restored?.lastWorldReasoningPolicy).toEqual(latestWorldReasoningPolicy);
    expect(restored?.lastWorldMemoryGuard).toEqual(latestWorldMemoryGuard);
  });
});
