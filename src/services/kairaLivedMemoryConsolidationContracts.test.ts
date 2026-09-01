import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import type { WorldEventObservation } from "./worldModelEventStore";
import { appraiseLivedMemoryCandidate } from "./kairaLivedMemoryConsolidation";

const state = (overrides: Partial<DroitDynamicState> = {}): DroitDynamicState => ({
  calmness: 35,
  anger: 72,
  stress: 68,
  happiness: 30,
  confidence: 60,
  surprise: 20,
  lastStatus: "etkilendi",
  reactionMode: "hurt",
  lastEvent: {
    eventTitle: "negative interaction",
    reactionText: "hurt",
    deltas: [
      { label: "anger", key: "anger", value: 12 },
      { label: "stress", key: "stress", value: 14 },
      { label: "happiness", key: "happiness", value: -10 },
    ],
  },
  relationship: {
    firstSeenAt: "2026-08-01T10:00:00.000Z",
    lastInteractionAt: "2026-09-01T10:00:00.000Z",
    interactionCount: 40,
    familiarityDays: 31,
    warmth: 78,
    trust: 74,
    conflictScore: 34,
    hurtScore: 42,
  },
  ...overrides,
});

const observation = (
  overrides: Partial<WorldEventObservation> = {},
): WorldEventObservation => ({
  id: "obs_001",
  userId: "user_1",
  kairaInstanceId: "kaira_1",
  sessionId: "session_1",
  kind: "direct_interaction",
  status: "grounded",
  createdAt: "2026-09-01T10:00:00.000Z",
  event: {
    raw: "salaksın",
    eventType: "insult",
    actor: { id: "user_1", source: "first_person", confidence: 1 },
    target: { id: "kaira_1", source: "second_person", confidence: 1 },
    reportedSpeech: false,
    certainty: 0.95,
    ambiguities: [],
    evidence: ["direct"],
    proposition: {
      key: "user_1|insult|kaira_1|salak",
      predicate: "insult",
      actorKey: "user_1",
      targetKey: "kaira_1",
      contentKey: "salak",
    },
    polarity: "positive",
    temporal: { relation: "present", asksLatest: false },
  },
  ...overrides,
});

const individual = { instanceId: "kaira_1", instanceType: "individual" as const };

describe("lived autobiographical memory consolidation", () => {
  it("consolidates a salient grounded event Kaira directly lived", () => {
    const decision = appraiseLivedMemoryCandidate({
      instance: individual,
      observation: observation(),
      dynamicStateAfter: state(),
    });

    expect(decision.status).toBe("consolidate");
    expect(decision.memory).toMatchObject({
      id: "lived_obs_001",
      origin: "lived",
      eventType: "insult",
      canonical: true,
      sourceWorldObservationIds: ["obs_001"],
      consolidationKey: "world:obs_001",
    });
    expect(decision.memory?.participantIds).toEqual(["user_1"]);
    expect(decision.memory?.facts).toContain("salak");
    expect(decision.memory).not.toHaveProperty("narrationText");
  });

  it("does not turn Welcome Kaira events into a canonical life", () => {
    expect(appraiseLivedMemoryCandidate({
      instance: { instanceId: "welcome_1", instanceType: "welcome" },
      observation: observation(),
      dynamicStateAfter: state(),
    }).status).toBe("skip_ephemeral_instance");
  });

  it("rejects ambiguous and reported evidence as lived experience", () => {
    expect(appraiseLivedMemoryCandidate({
      instance: individual,
      observation: observation({ status: "ambiguous" }),
      dynamicStateAfter: state(),
    }).status).toBe("skip_ambiguous");

    expect(appraiseLivedMemoryCandidate({
      instance: individual,
      observation: observation({ kind: "reported_claim" }),
      dynamicStateAfter: state(),
    }).status).toBe("skip_reported_claim");
  });

  it("does not convert claims about past or future into a current lived episode", () => {
    const past = observation();
    past.event = { ...past.event, temporal: { relation: "past", asksLatest: false } };
    expect(appraiseLivedMemoryCandidate({
      instance: individual,
      observation: past,
      dynamicStateAfter: state(),
    }).status).toBe("skip_nonpresent_claim");
  });

  it("requires Kaira to be a participant", () => {
    const thirdParty = observation();
    thirdParty.event = {
      ...thirdParty.event,
      target: { id: "mert", source: "explicit_name", confidence: 1 },
      proposition: { key: "user_1|insult|mert|salak", predicate: "insult", actorKey: "user_1", targetKey: "mert", contentKey: "salak" },
    };
    expect(appraiseLivedMemoryCandidate({
      instance: individual,
      observation: thirdParty,
      dynamicStateAfter: state(),
    }).status).toBe("skip_not_self_relevant");
  });

  it("does not experience a negated event", () => {
    const negated = observation();
    negated.event = { ...negated.event, polarity: "negative" };
    expect(appraiseLivedMemoryCandidate({
      instance: individual,
      observation: negated,
      dynamicStateAfter: state(),
    }).status).toBe("skip_negated_event");
  });

  it("does not memorize ordinary low-salience turns", () => {
    const ordinary = observation();
    ordinary.event = {
      ...ordinary.event,
      eventType: "general",
      proposition: { key: "user_1|general|kaira_1|?", predicate: "general", actorKey: "user_1", targetKey: "kaira_1" },
    };
    const calm = state({
      calmness: 85,
      anger: 4,
      stress: 8,
      happiness: 65,
      reactionMode: "neutral",
      lastEvent: undefined,
      relationship: { firstSeenAt: "2026-09-01T09:59:00.000Z", interactionCount: 1, warmth: 50, trust: 50 },
    });
    expect(appraiseLivedMemoryCandidate({
      instance: individual,
      observation: ordinary,
      dynamicStateAfter: calm,
    }).status).toBe("skip_low_salience");
  });

  it("is deterministic for the same canonical world observation", () => {
    const first = appraiseLivedMemoryCandidate({ instance: individual, observation: observation(), dynamicStateAfter: state() });
    const second = appraiseLivedMemoryCandidate({ instance: individual, observation: observation(), dynamicStateAfter: state() });
    expect(second.memory?.id).toBe(first.memory?.id);
    expect(second.memory?.consolidationKey).toBe(first.memory?.consolidationKey);
  });
});
