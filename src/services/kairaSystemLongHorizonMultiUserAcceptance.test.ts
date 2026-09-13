import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DroitDynamicState, DroitPersonalityTraits, ReasoningTrace } from "../types/nexus";
import { buildBehaviorContract } from "./behaviorContract";
import { computeKairoSpeechIdentity } from "./kairoSpeechIdentity";
import { resolveKairaFinalDelivery } from "./kairaFinalDeliveryGate";
import {
  reduceRelationshipTurn,
  type RelationshipReducerPrev,
  type RelationshipReducerResult,
  type RelationshipTurnSignal,
} from "./relationshipReducer";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";

const firestoreMemory = vi.hoisted(() => ({
  states: new Map<string, DroitDynamicState>(),
}));

vi.mock("../lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (...parts: unknown[]) => ({ kind: "doc", parts }),
  collection: (...parts: unknown[]) => ({ kind: "collection", parts }),
  query: (...parts: unknown[]) => ({ kind: "query", parts }),
  orderBy: (...parts: unknown[]) => ({ kind: "orderBy", parts }),
  limit: (value: number) => ({ kind: "limit", value }),
  where: (...parts: unknown[]) => ({ kind: "where", parts }),
  setDoc: vi.fn(async (ref: { parts?: unknown[] }, value: { dynamicState?: DroitDynamicState }) => {
    const key = String(ref.parts?.[ref.parts.length - 1] ?? "unknown");
    if (value.dynamicState) {
      firestoreMemory.states.set(key, JSON.parse(JSON.stringify(value.dynamicState)) as DroitDynamicState);
    }
  }),
  addDoc: vi.fn(async () => ({ id: "trace" })),
  getDoc: vi.fn(async (ref: { parts?: unknown[] }) => {
    const key = String(ref.parts?.[ref.parts.length - 1] ?? "unknown");
    return {
      exists: () => firestoreMemory.states.has(key),
      data: () => ({ dynamicState: firestoreMemory.states.get(key) }),
    };
  }),
  getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
  deleteDoc: vi.fn(async () => undefined),
}));

import { loadKdmState, saveKdmInteraction } from "./kdmPersistenceService";

const ZERO = { disrespect: 0, coercion: 0, aggression: 0, manipulation: 0, privacy: 0 };

const positiveSignal: RelationshipTurnSignal = {
  valence: "positive",
  targetsKaira: true,
  severity: ZERO,
  jokingConfidence: 0,
  sincerityConfidence: 1,
  apology: false,
  repairAttempt: false,
  repairStrength: 0,
  support: 0.55,
  compliment: 0.35,
  affection: 0.2,
  userStop: false,
  uncertainty: 0.02,
  negativePattern: null,
};

const mildDirectNegative: RelationshipTurnSignal = {
  valence: "negative",
  targetsKaira: true,
  severity: { ...ZERO, disrespect: 0.42, aggression: 0.08 },
  jokingConfidence: 0,
  sincerityConfidence: 0.92,
  apology: false,
  repairAttempt: false,
  repairStrength: 0,
  support: 0,
  compliment: 0,
  affection: 0,
  userStop: false,
  uncertainty: 0.06,
  negativePattern: "system-long-horizon-mild-disrespect",
};

const personality: DroitPersonalityTraits = {
  anger: 50, patience: 50, empathy: 50, emotionalSensitivity: 50,
  socialIntelligence: 50, selfConfidence: 50, humor: 50, communication: 50,
  charisma: 50, curiosity: 50, analyticalThinking: 50, creativity: 50,
  decisionMaking: 50, attention: 50, authority: 50, courage: 50,
  seriousness: 50, loyalty: 50, initiative: 50,
};

function initialPrev(): RelationshipReducerPrev {
  return {
    scores: {
      warmth: 50,
      trust: 50,
      conflict: 0,
      hurt: 0,
      repairProgress: 0,
      positiveEvents: 0,
      negativeEvents: 0,
      repeatedNegativeCount: 0,
    },
    conversationState: "active",
    reactionMode: "neutral",
    affect: { anger: 10, stress: 20, happiness: 70, calmness: 70 },
    firstSeenAt: "2026-07-01T00:00:00.000Z",
    lastInteractionAt: "2026-09-13T08:00:00.000Z",
    interactionCount: 0,
    repairAttempts: 0,
    boundarySetByKaira: false,
  };
}

function nextPrev(previous: RelationshipReducerPrev, result: RelationshipReducerResult, nowIso: string): RelationshipReducerPrev {
  return {
    scores: { ...result.scores },
    conversationState: result.conversationState,
    reactionMode: result.reactionMode,
    affect: {
      anger: previous.affect.anger + result.affectDelta.anger,
      stress: previous.affect.stress + result.affectDelta.stress,
      happiness: previous.affect.happiness + result.affectDelta.happiness,
      calmness: previous.affect.calmness + result.affectDelta.calmness,
    },
    firstSeenAt: previous.firstSeenAt,
    lastInteractionAt: nowIso,
    lastConflictAt: result.lastConflictAt,
    lastNegativePattern: result.lastNegativePattern,
    disengagedAt: result.disengagedAt,
    disengageReason: result.disengageReason,
    repairAttempts: result.repairAttempts,
    interactionCount: result.interactionCount,
    boundarySetByKaira: result.boundarySetByKaira,
  };
}

function runHistory(kind: "supportive" | "mixed", turns = 60) {
  let prev = initialPrev();
  let last!: RelationshipReducerResult;
  for (let index = 1; index <= turns; index += 1) {
    const nowIso = new Date(Date.UTC(2026, 8, 13, 8, index * 5)).toISOString();
    const signal = kind === "mixed" && index % 5 === 0 ? mildDirectNegative : positiveSignal;
    last = reduceRelationshipTurn({
      prev,
      signal,
      timing: { elapsedMinutesSincePrev: 5, nowIso },
      config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
    });
    prev = nextPrev(prev, last, nowIso);
  }
  return { prev, last };
}

function applySharedProbe(prev: RelationshipReducerPrev, minute: number) {
  return reduceRelationshipTurn({
    prev,
    signal: mildDirectNegative,
    timing: {
      elapsedMinutesSincePrev: 5,
      nowIso: new Date(Date.UTC(2026, 8, 13, 14, minute)).toISOString(),
    },
    config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
  });
}

function toDynamicState(prev: RelationshipReducerPrev): DroitDynamicState {
  return {
    calmness: prev.affect.calmness,
    anger: prev.affect.anger,
    stress: prev.affect.stress,
    happiness: prev.affect.happiness,
    confidence: 70,
    surprise: 10,
    lastStatus: prev.reactionMode,
    reactionMode: prev.reactionMode,
    relationship: {
      firstSeenAt: prev.firstSeenAt!,
      lastInteractionAt: prev.lastInteractionAt!,
      interactionCount: prev.interactionCount ?? 0,
      familiarityDays: 74,
      warmth: Number(prev.scores.warmth ?? 50),
      trust: Number(prev.scores.trust ?? 50),
      positiveEvents: Number(prev.scores.positiveEvents ?? 0),
      negativeEvents: Number(prev.scores.negativeEvents ?? 0),
      conflictScore: Number(prev.scores.conflict ?? 0),
      hurtScore: Number(prev.scores.hurt ?? 0),
      repairProgress: Number(prev.scores.repairProgress ?? 0),
      repeatedNegativeCount: Number(prev.scores.repeatedNegativeCount ?? 0),
      conversationState: prev.conversationState,
      repairAttempts: prev.repairAttempts ?? 0,
      ...(prev.lastConflictAt ? { lastConflictAt: prev.lastConflictAt } : {}),
      ...(prev.lastNegativePattern ? { lastNegativePattern: prev.lastNegativePattern } : {}),
    },
  } as DroitDynamicState;
}

function traceFor(state: DroitDynamicState, userName: string): ReasoningTrace {
  const relationship = state.relationship!;
  return {
    whoSent: { userName, isNewUser: false, recognitionText: "long-horizon-known" },
    relationship: {
      warmthScore: relationship.warmth ?? 50,
      warmthLabel: "acceptance",
      note: "120-turn-multi-user",
      familiarityDays: relationship.familiarityDays,
      interactionCount: relationship.interactionCount,
      trustScore: relationship.trust,
      conflictScore: relationship.conflictScore,
      hurtScore: relationship.hurtScore,
      repairProgress: relationship.repairProgress,
      conversationState: relationship.conversationState,
      repairAttempts: relationship.repairAttempts,
      repeatedNegativeCount: relationship.repeatedNegativeCount,
    },
    currentMood: { moodText: state.reactionMode ?? "neutral", reasonText: "long-horizon", reactionMode: state.reactionMode },
    messageInterpretation: { intent: "probe", sentiment: "negatif", explanation: "canonical shared probe" },
    decision: { chosenTone: "acceptance", explanation: "system acceptance" },
    memoryUpdate: {
      warmthBefore: relationship.warmth ?? 50,
      warmthAfter: relationship.warmth ?? 50,
      warmthDelta: 0,
      moodChange: "none",
      reason: "acceptance",
    },
  } as unknown as ReasoningTrace;
}

function persistenceTrace(state: DroitDynamicState): ReasoningTrace {
  const relationship = state.relationship!;
  return {
    relationship: {
      warmthScore: relationship.warmth ?? 50,
      trustScore: relationship.trust ?? 50,
      conflictScore: relationship.conflictScore ?? 0,
      hurtScore: relationship.hurtScore ?? 0,
      repairProgress: relationship.repairProgress ?? 0,
      repeatedNegativeCount: relationship.repeatedNegativeCount ?? 0,
    },
  } as unknown as ReasoningTrace;
}

describe("Kaira system long-horizon multi-user acceptance", () => {
  beforeEach(() => firestoreMemory.states.clear());

  it("keeps 120 turns across two users isolated while history changes the same final event", () => {
    const userA = runHistory("supportive", 60);
    const userBBefore = initialPrev();
    const aSnapshot = JSON.parse(JSON.stringify(userA.prev));
    const userB = runHistory("mixed", 60);

    expect(userA.last.interactionCount + userB.last.interactionCount).toBe(120);
    expect(userA.prev).toEqual(aSnapshot);
    expect(userBBefore.interactionCount).toBe(0);

    const aProbe = applySharedProbe(userA.prev, 5);
    const bProbe = applySharedProbe(userB.prev, 5);

    expect(userA.last.scores.warmth).toBeGreaterThan(userB.last.scores.warmth);
    expect(userA.last.scores.trust).toBeGreaterThan(userB.last.scores.trust);
    expect(userB.last.scores.negativeEvents).toBeGreaterThan(userA.last.scores.negativeEvents);
    expect(aProbe.hard.disengage).toBe(false);
    expect(bProbe.hard.disengage).toBe(false);
    expect({ hurt: aProbe.scores.hurt, conflict: aProbe.scores.conflict }).not.toEqual({
      hurt: bProbe.scores.hurt,
      conflict: bProbe.scores.conflict,
    });
  });

  it("keeps two users isolated through the real save/load normalization path", async () => {
    const aState = toDynamicState(runHistory("supportive", 60).prev);
    const bState = toDynamicState(runHistory("mixed", 60).prev);

    await saveKdmInteraction({
      dynamicState: aState,
      reasoningTrace: persistenceTrace(aState),
      lastUserMessage: "A persistence probe",
      reply: "ok",
      userId: "long-horizon-user-a",
      memoryScope: "episodic",
    });
    await saveKdmInteraction({
      dynamicState: bState,
      reasoningTrace: persistenceTrace(bState),
      lastUserMessage: "B persistence probe",
      reply: "ok",
      userId: "long-horizon-user-b",
      memoryScope: "episodic",
    });

    const hydratedA = await loadKdmState("long-horizon-user-a");
    const hydratedB = await loadKdmState("long-horizon-user-b");

    expect(hydratedA?.relationship?.interactionCount).toBe(60);
    expect(hydratedB?.relationship?.interactionCount).toBe(60);
    expect(hydratedA?.relationship?.warmth).toBe(aState.relationship?.warmth);
    expect(hydratedB?.relationship?.warmth).toBe(bState.relationship?.warmth);
    expect(hydratedA?.relationship?.warmth).not.toBe(hydratedB?.relationship?.warmth);
    expect(hydratedA?.relationship?.negativeEvents).not.toBe(hydratedB?.relationship?.negativeEvents);
  });

  it("feeds long-horizon states into HOW/WHAT and final delivery without permission leakage or empty persistence", () => {
    const aState = toDynamicState(runHistory("supportive", 60).prev);
    const bState = toDynamicState(runHistory("mixed", 60).prev);
    const aTrace = traceFor(aState, "user-a");
    const bTrace = traceFor(bState, "user-b");

    const speechA = computeKairoSpeechIdentity(personality, aState, aTrace);
    const speechB = computeKairoSpeechIdentity(personality, bState, bTrace);
    const contractA = buildBehaviorContract(aState, aTrace, {
      stopTalking: false,
      stopQuestions: false,
      adviceRequested: false,
      semanticUncertainty: 0.06,
    });
    const contractB = buildBehaviorContract(bState, bTrace, {
      stopTalking: false,
      stopQuestions: false,
      adviceRequested: false,
      semanticUncertainty: 0.06,
    });

    expect(speechA.register).toBeTruthy();
    expect(speechB.register).toBeTruthy();
    expect(contractA.advice).toBe("forbidden");
    expect(contractB.advice).toBe("forbidden");
    expect(contractA.conversationState).toBe(aState.relationship?.conversationState);
    expect(contractB.conversationState).toBe(bState.relationship?.conversationState);

    const deliveryA = resolveKairaFinalDelivery(`register:${speechA.register}`, { accepted: true, score: 1, issues: [] });
    const deliveryB = resolveKairaFinalDelivery(`register:${speechB.register}`, { accepted: true, score: 1, issues: [] });
    expect(deliveryA.accepted).toBe(true);
    expect(deliveryB.accepted).toBe(true);
    expect(deliveryA.persistedReply.length).toBeGreaterThan(0);
    expect(deliveryB.persistedReply.length).toBeGreaterThan(0);
  });
});
