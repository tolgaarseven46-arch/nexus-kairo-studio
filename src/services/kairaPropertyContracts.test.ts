import { describe, expect, it } from "vitest";
import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { resolveMessageEntities } from "./entityResolutionEngine";
import { groundSemanticEventForAppraisal } from "./languageUnderstandingService";
import { analyzeKdmInteraction } from "./kdmConsistencyEngine";
import { buildBehaviorContract } from "./behaviorContract";
import { projectConversationStateLock } from "./conversationStateLock";
import { validateStateBehaviorSeam } from "./kairaStateBehaviorContracts";

const personality: DroitPersonalityTraits = {
  anger: 55, patience: 55, empathy: 55, emotionalSensitivity: 50,
  socialIntelligence: 55, selfConfidence: 60, humor: 55, communication: 55,
  charisma: 50, curiosity: 55, analyticalThinking: 55, creativity: 50,
  decisionMaking: 55, attention: 55, authority: 50, courage: 50,
  seriousness: 50, loyalty: 55, initiative: 50,
};

const initialState = (): DroitDynamicState => ({
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
  relationship: {
    firstSeenAt: "2026-08-30T00:00:00.000Z",
    lastInteractionAt: "2026-08-30T00:00:00.000Z",
    interactionCount: 0,
    familiarityDays: 0,
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
});

const thirdPartyMessages = [
  "Ayşe bana salak dedi",
  "Merve bana aptal dedi",
  "Selin bana özür diledi",
  "Burak bana iyi adamsın dedi",
  "patron bugün çok saçmaladı",
  "Mert salak herif ya",
] as const;

const directMessages = [
  "Kaira çok saçmalıyorsun",
  "senden hiç hoşlanmıyorum",
  "özür dilerim",
  "barışalım",
  "naber kaira",
  "bugün yoruldum",
  "tamam",
  "iyi ki varsın",
] as const;

const boundedKeys: Array<keyof DroitDynamicState> = [
  "calmness", "anger", "stress", "happiness", "confidence", "surprise",
];

function appraisalEvent(message: string) {
  const semantic = interpretSemanticEvent(message);
  const entities = resolveMessageEntities(message, { userName: "Mert", characterName: "KAIRO" });
  return groundSemanticEventForAppraisal(message, semantic, entities).event;
}

function step(message: string, state: DroitDynamicState) {
  const result = analyzeKdmInteraction(message, personality, state, appraisalEvent(message));
  const next = result.nextDynamicState;
  const behavior = buildBehaviorContract(next, result.trace);
  const stateLock = projectConversationStateLock(next);
  const seam = validateStateBehaviorSeam({ state: next, behavior, stateLock });
  return { result, next, seam };
}

function lcg(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

describe("Kaira property-style architecture contracts", () => {
  it("keeps core state invariants across 100 deterministic generated sequences", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const random = lcg(seed);
      let state = initialState();
      let expectedInteractions = 0;

      for (let turn = 0; turn < 30; turn += 1) {
        const pool = random() < 0.45 ? thirdPartyMessages : directMessages;
        const message = pool[Math.floor(random() * pool.length)]!;
        const { next, seam } = step(message, state);
        expectedInteractions += 1;

        expect(next.relationship?.interactionCount, `seed=${seed} turn=${turn} ${message}`).toBe(expectedInteractions);
        expect(seam.issues, `seed=${seed} turn=${turn} ${message}`).toEqual([]);

        for (const key of boundedKeys) {
          const value = Number(next[key]);
          expect(Number.isFinite(value), `${key} seed=${seed} turn=${turn}`).toBe(true);
          expect(value, `${key} seed=${seed} turn=${turn}`).toBeGreaterThanOrEqual(0);
          expect(value, `${key} seed=${seed} turn=${turn}`).toBeLessThanOrEqual(100);
        }

        for (const value of [
          next.relationship?.warmth,
          next.relationship?.trust,
          next.relationship?.conflictScore,
          next.relationship?.hurtScore,
          next.relationship?.repairProgress,
        ]) {
          expect(Number(value ?? 0)).toBeGreaterThanOrEqual(0);
          expect(Number(value ?? 0)).toBeLessThanOrEqual(100);
        }

        state = next;
      }
    }
  });

  it.each(thirdPartyMessages)("never mutates Kaira-user relationship damage/reward for third-party event: %s", (message) => {
    const before = initialState();
    const { next } = step(message, before);

    expect(next.relationship?.warmth).toBe(before.relationship?.warmth);
    expect(next.relationship?.trust).toBe(before.relationship?.trust);
    expect(next.relationship?.positiveEvents).toBe(before.relationship?.positiveEvents);
    expect(next.relationship?.negativeEvents).toBe(before.relationship?.negativeEvents);
    expect(next.relationship?.hurtScore).toBe(before.relationship?.hurtScore);
    expect(next.relationship?.conflictScore).toBe(before.relationship?.conflictScore);
  });

  it("preserves world meaning while projecting third-party apology away from relationship repair", () => {
    const message = "Ayşe bana özür diledi";
    const semantic = interpretSemanticEvent(message);
    const entities = resolveMessageEntities(message, { userName: "Mert", characterName: "KAIRO" });
    const grounded = groundSemanticEventForAppraisal(message, semantic, entities);

    expect(grounded.worldEvent.eventType).toBe("apology");
    expect(grounded.worldEvent.actor?.name).toBe("Ayşe");
    expect(grounded.event.relationshipScope).toBe("third_party");
    expect(grounded.event.apology).toBe(false);
    expect(grounded.event.valence).toBe("neutral");
  });
});
