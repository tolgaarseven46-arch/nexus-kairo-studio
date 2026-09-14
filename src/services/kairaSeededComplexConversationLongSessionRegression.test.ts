import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DroitDynamicState, ReasoningTrace } from "../types/nexus";
import { analyzeKdmInteraction } from "./kdmConsistencyEngine";
import { buildBehaviorContract } from "./behaviorContract";
import { computeKairoSpeechIdentity } from "./kairoSpeechIdentity";
import { resolveKairaFinalDelivery } from "./kairaFinalDeliveryGate";
import { NEUTRAL_DROIT_PERSONALITY } from "./droitPersonalityNormalizer";

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

const USER_A = "seeded-complex-user-a";
const USER_B = "seeded-complex-user-b";
const TURNS_PER_USER = 80;

const messagePool = [
  "naber kanka",
  "bugün işler baya yoğundu",
  "kahveyi seviyorum ama çayı pek sevmiyorum",
  "Mert bugün biraz saçmaladı",
  "Ali yarın toplantıya gidecekmiş",
  "ya bazen çok saçmalıyorsun",
  "yanlış anlama biraz sinirliydim",
  "özür dilerim, sert konuştum",
  "tamam devam edelim",
  "geçen konuştuğumuz şeyi hatırlıyor musun",
  "Mert bana kızmış olabilir mi sence",
  "bugün modum pek yok",
  "şaka yaptım ya ciddiye alma",
  "sana güveniyorum",
  "bunu sonra konuşuruz",
  "yarın hallederim diye söz veriyorum",
  "aslında yetiştiremedim",
  "neyse konu değiştirelim",
] as const;

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function initialState(): DroitDynamicState {
  return {
    calmness: 70,
    anger: 10,
    stress: 20,
    happiness: 70,
    confidence: 70,
    surprise: 10,
    lastStatus: "Sakin",
    reactionMode: "neutral",
    relationship: {
      firstSeenAt: "2026-09-01T00:00:00.000Z",
      lastInteractionAt: "2026-09-13T08:00:00.000Z",
      familiarityDays: 12,
      interactionCount: 0,
      warmth: 50,
      trust: 50,
      positiveEvents: 0,
      negativeEvents: 0,
      conflictScore: 0,
      hurtScore: 0,
      repairProgress: 0,
      repeatedNegativeCount: 0,
      conversationState: "active",
      repairAttempts: 0,
    },
  };
}

function assertFiniteBoundedState(state: DroitDynamicState): void {
  const topLevel = [
    state.calmness,
    state.anger,
    state.stress,
    state.happiness,
    state.confidence,
    state.surprise,
  ];
  for (const value of topLevel) {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  }

  const relationship = state.relationship;
  expect(relationship).toBeTruthy();
  if (!relationship) return;
  const relationshipScores = [
    relationship.warmth,
    relationship.trust,
    relationship.conflictScore,
    relationship.hurtScore,
    relationship.repairProgress,
  ];
  for (const value of relationshipScores) {
    expect(Number.isFinite(value ?? 0)).toBe(true);
    expect(value ?? 0).toBeGreaterThanOrEqual(0);
    expect(value ?? 0).toBeLessThanOrEqual(100);
  }
}

function stableReplayState(state: DroitDynamicState): unknown {
  const copy = JSON.parse(JSON.stringify(state)) as {
    lastEvent?: {
      reactionText?: string;
    };
    relationship?: {
      lastInteractionAt?: string;
      dyadicNorm?: {
        evidence?: Record<string, { lastObservedAt?: string } | undefined>;
      };
    };
  };

  if (copy.lastEvent) {
    delete copy.lastEvent.reactionText;
  }

  if (copy.relationship) {
    delete copy.relationship.lastInteractionAt;
    const evidence = copy.relationship.dyadicNorm?.evidence;
    if (evidence) {
      for (const item of Object.values(evidence)) {
        if (item) delete item.lastObservedAt;
      }
    }
  }

  return copy;
}

function runSeededConversation(seed: number, bias: "supportive" | "volatile") {
  const random = seeded(seed);
  let state = initialState();
  let lastTrace!: ReasoningTrace;
  const transcript: string[] = [];

  for (let turn = 0; turn < TURNS_PER_USER; turn += 1) {
    let poolIndex = Math.floor(random() * messagePool.length);

    if (bias === "supportive" && turn % 9 === 0) poolIndex = 13;
    if (bias === "volatile" && turn % 8 === 0) poolIndex = 5;
    if (bias === "volatile" && turn % 8 === 1) poolIndex = 7;
    if (turn % 17 === 0) poolIndex = 3;
    if (turn % 23 === 0) poolIndex = 15;
    if (turn % 23 === 1) poolIndex = 16;

    const message = messagePool[poolIndex];
    transcript.push(message);
    const result = analyzeKdmInteraction(message, NEUTRAL_DROIT_PERSONALITY, state);
    state = result.nextDynamicState;
    lastTrace = result.trace;
    assertFiniteBoundedState(state);
  }

  return { state, trace: lastTrace, transcript };
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

describe("Kaira seeded complex conversation long-session regression", () => {
  beforeEach(() => firestoreMemory.states.clear());

  it("replays 160 mixed turns deterministically while keeping two user histories independent", () => {
    const firstA = runSeededConversation(0x4b414952, "supportive");
    const firstB = runSeededConversation(0x4e455855, "volatile");
    const replayA = runSeededConversation(0x4b414952, "supportive");
    const replayB = runSeededConversation(0x4e455855, "volatile");

    expect(firstA.transcript).toEqual(replayA.transcript);
    expect(firstB.transcript).toEqual(replayB.transcript);
    expect(stableReplayState(firstA.state)).toEqual(stableReplayState(replayA.state));
    expect(stableReplayState(firstB.state)).toEqual(stableReplayState(replayB.state));
    expect(firstA.transcript).not.toEqual(firstB.transcript);

    expect(firstA.state.relationship?.interactionCount).toBe(TURNS_PER_USER);
    expect(firstB.state.relationship?.interactionCount).toBe(TURNS_PER_USER);

    expect({
      warmth: firstA.state.relationship?.warmth,
      trust: firstA.state.relationship?.trust,
      hurt: firstA.state.relationship?.hurtScore,
      conflict: firstA.state.relationship?.conflictScore,
      negatives: firstA.state.relationship?.negativeEvents,
    }).not.toEqual({
      warmth: firstB.state.relationship?.warmth,
      trust: firstB.state.relationship?.trust,
      hurt: firstB.state.relationship?.hurtScore,
      conflict: firstB.state.relationship?.conflictScore,
      negatives: firstB.state.relationship?.negativeEvents,
    });
  }, 120_000);

  it("survives save/load restart without cross-user contamination", async () => {
    const a = runSeededConversation(0x4b414952, "supportive");
    const b = runSeededConversation(0x4e455855, "volatile");

    await saveKdmInteraction({
      dynamicState: a.state,
      reasoningTrace: persistenceTrace(a.state),
      lastUserMessage: a.transcript.at(-1) ?? "",
      reply: "seeded-a-ok",
      userId: USER_A,
      memoryScope: "episodic",
    });
    await saveKdmInteraction({
      dynamicState: b.state,
      reasoningTrace: persistenceTrace(b.state),
      lastUserMessage: b.transcript.at(-1) ?? "",
      reply: "seeded-b-ok",
      userId: USER_B,
      memoryScope: "episodic",
    });

    const hydratedA = await loadKdmState(USER_A);
    const hydratedB = await loadKdmState(USER_B);

    expect(hydratedA).toBeTruthy();
    expect(hydratedB).toBeTruthy();
    expect(hydratedA?.relationship?.interactionCount).toBe(TURNS_PER_USER);
    expect(hydratedB?.relationship?.interactionCount).toBe(TURNS_PER_USER);
    expect(hydratedA?.relationship?.warmth).toBe(a.state.relationship?.warmth);
    expect(hydratedB?.relationship?.warmth).toBe(b.state.relationship?.warmth);
    expect(hydratedA?.relationship).not.toEqual(hydratedB?.relationship);
    assertFiniteBoundedState(hydratedA!);
    assertFiniteBoundedState(hydratedB!);
  }, 120_000);

  it("keeps HOW/WHAT authority and final delivery valid after the long mixed histories", () => {
    for (const session of [
      runSeededConversation(0x4b414952, "supportive"),
      runSeededConversation(0x4e455855, "volatile"),
    ]) {
      const speech = computeKairoSpeechIdentity(
        NEUTRAL_DROIT_PERSONALITY,
        session.state,
        session.trace,
      );
      const contract = buildBehaviorContract(session.state, session.trace, {
        stopTalking: false,
        stopQuestions: false,
        adviceRequested: false,
        semanticUncertainty: 0.1,
      });

      expect(speech.register).toBeTruthy();
      expect(contract.advice).toBe("forbidden");
      expect(contract.conversationState).toBe(session.state.relationship?.conversationState);

      const delivery = resolveKairaFinalDelivery(
        `register:${speech.register}`,
        { accepted: true, score: 1, issues: [] },
      );
      expect(delivery.accepted).toBe(true);
      expect(delivery.persistedReply.length).toBeGreaterThan(0);
    }
  }, 120_000);
});
