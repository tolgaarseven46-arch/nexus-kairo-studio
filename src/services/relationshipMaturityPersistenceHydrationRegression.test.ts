import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DroitDynamicState, ReasoningTrace } from "../types/nexus";
import {
  reduceRelationshipTurn,
  type RelationshipReducerPrev,
  type RelationshipTurnSignal,
} from "./relationshipReducer";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";

const firestoreMemory = vi.hoisted(() => ({
  dynamicState: null as DroitDynamicState | null,
}));

vi.mock("../lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (...parts: unknown[]) => ({ kind: "doc", parts }),
  collection: (...parts: unknown[]) => ({ kind: "collection", parts }),
  query: (...parts: unknown[]) => ({ kind: "query", parts }),
  orderBy: (...parts: unknown[]) => ({ kind: "orderBy", parts }),
  limit: (value: number) => ({ kind: "limit", value }),
  where: (...parts: unknown[]) => ({ kind: "where", parts }),
  setDoc: vi.fn(async (_ref: unknown, value: { dynamicState?: DroitDynamicState }) => {
    if (value.dynamicState) {
      firestoreMemory.dynamicState = JSON.parse(JSON.stringify(value.dynamicState)) as DroitDynamicState;
    }
  }),
  addDoc: vi.fn(async () => ({ id: "trace" })),
  getDoc: vi.fn(async () => ({
    exists: () => firestoreMemory.dynamicState !== null,
    data: () => ({ dynamicState: firestoreMemory.dynamicState }),
  })),
  getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
  deleteDoc: vi.fn(async () => undefined),
}));

import { loadKdmState, saveKdmInteraction } from "./kdmPersistenceService";

const ZERO = {
  disrespect: 0,
  coercion: 0,
  manipulation: 0,
  privacy: 0,
  aggression: 0,
};

const mildDirectNegative: RelationshipTurnSignal = {
  valence: "negative",
  targetsKaira: true,
  severity: { ...ZERO, disrespect: 0.42, aggression: 0.08 },
  jokingConfidence: 0,
  sincerityConfidence: 0.9,
  apology: false,
  repairAttempt: false,
  repairStrength: 0,
  support: 0,
  compliment: 0,
  affection: 0,
  userStop: false,
  uncertainty: 0.08,
  negativePattern: "maturity-real-hydration-mild-disrespect",
};

function matureDynamicState(): DroitDynamicState {
  return {
    calmness: 70,
    anger: 10,
    stress: 20,
    happiness: 70,
    confidence: 70,
    surprise: 10,
    lastStatus: "Sakin ve kontrollü",
    reactionMode: "neutral",
    relationship: {
      firstSeenAt: "2026-07-13T12:00:00.000Z",
      lastInteractionAt: "2026-09-13T11:55:00.000Z",
      interactionCount: 90,
      familiarityDays: 62,
      warmth: 72,
      trust: 74,
      positiveEvents: 20,
      negativeEvents: 2,
      conflictScore: 3,
      hurtScore: 4,
      repairProgress: 0,
      repeatedNegativeCount: 0,
      conversationState: "active",
      repairAttempts: 0,
    },
  } as DroitDynamicState;
}

function reasoningTrace(): ReasoningTrace {
  return {
    relationship: {
      warmthScore: 72,
      trustScore: 74,
      conflictScore: 3,
      hurtScore: 4,
      repairProgress: 0,
      repeatedNegativeCount: 0,
    },
  } as unknown as ReasoningTrace;
}

function reducerPrev(state: DroitDynamicState): RelationshipReducerPrev {
  const relationship = state.relationship!;
  return {
    scores: {
      warmth: relationship.warmth,
      trust: relationship.trust,
      conflict: relationship.conflictScore,
      hurt: relationship.hurtScore,
      repairProgress: relationship.repairProgress,
      positiveEvents: relationship.positiveEvents,
      negativeEvents: relationship.negativeEvents,
      repeatedNegativeCount: relationship.repeatedNegativeCount,
    },
    conversationState: relationship.conversationState ?? "active",
    reactionMode: state.reactionMode ?? "neutral",
    affect: {
      anger: state.anger,
      stress: state.stress,
      happiness: state.happiness,
      calmness: state.calmness,
    },
    firstSeenAt: relationship.firstSeenAt,
    lastInteractionAt: relationship.lastInteractionAt,
    interactionCount: relationship.interactionCount,
    repairAttempts: relationship.repairAttempts ?? 0,
    lastConflictAt: relationship.lastConflictAt,
    lastNegativePattern: relationship.lastNegativePattern,
    disengagedAt: relationship.disengagedAt,
    disengageReason: relationship.disengageReason,
    boundarySetByKaira: false,
  };
}

function applySameTurn(prev: RelationshipReducerPrev) {
  return reduceRelationshipTurn({
    prev,
    signal: mildDirectNegative,
    timing: {
      elapsedMinutesSincePrev: 5,
      nowIso: "2026-09-13T12:00:00.000Z",
    },
    config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
  });
}

describe("Relationship maturity real persistence hydration", () => {
  beforeEach(() => {
    firestoreMemory.dynamicState = null;
  });

  it("preserves maturity history and identical reducer behavior across save/load", async () => {
    const beforeState = matureDynamicState();
    const beforeResult = applySameTurn(reducerPrev(beforeState));

    await saveKdmInteraction({
      dynamicState: beforeState,
      reasoningTrace: reasoningTrace(),
      lastUserMessage: "persistence hydration probe",
      reply: "ok",
      userId: "maturity-hydration-proof",
      memoryScope: "episodic",
    });

    const hydrated = await loadKdmState("maturity-hydration-proof");
    expect(hydrated).not.toBeNull();
    expect(hydrated?.relationship?.firstSeenAt).toBe(beforeState.relationship?.firstSeenAt);
    expect(hydrated?.relationship?.lastInteractionAt).toBe(beforeState.relationship?.lastInteractionAt);
    expect(hydrated?.relationship?.interactionCount).toBe(beforeState.relationship?.interactionCount);
    expect(hydrated?.relationship?.warmth).toBe(beforeState.relationship?.warmth);
    expect(hydrated?.relationship?.trust).toBe(beforeState.relationship?.trust);

    const afterResult = applySameTurn(reducerPrev(hydrated!));

    expect(afterResult.scores.familiarity).toBe(beforeResult.scores.familiarity);
    expect(afterResult.scores.conflict).toBe(beforeResult.scores.conflict);
    expect(afterResult.scores.hurt).toBe(beforeResult.scores.hurt);
    expect(afterResult.reactionMode).toBe(beforeResult.reactionMode);
    expect(afterResult.hard).toEqual(beforeResult.hard);
  });
});
