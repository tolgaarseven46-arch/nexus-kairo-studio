import { describe, expect, it } from "vitest";
import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";
import { analyzeKdmInteraction } from "./kdmConsistencyEngine";
import { buildBehaviorContract } from "./behaviorContract";
import { projectConversationStateLock } from "./conversationStateLock";
import { validateStateBehaviorSeam } from "./kairaStateBehaviorContracts";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { resolveMessageEntities } from "./entityResolutionEngine";
import { groundSemanticEventForAppraisal } from "./languageUnderstandingService";

const personality: DroitPersonalityTraits = {
  anger: 55,
  patience: 55,
  empathy: 55,
  emotionalSensitivity: 50,
  socialIntelligence: 55,
  selfConfidence: 60,
  humor: 55,
  communication: 55,
  charisma: 50,
  curiosity: 55,
  analyticalThinking: 55,
  creativity: 50,
  decisionMaking: 55,
  attention: 55,
  authority: 50,
  courage: 50,
  seriousness: 50,
  loyalty: 55,
  initiative: 50,
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

function canonicalSemantic(message: string) {
  const semantic = interpretSemanticEvent(message);
  const entities = resolveMessageEntities(message, {
    userName: "Mert",
    characterName: "KAIRO",
  });
  return groundSemanticEventForAppraisal(message, semantic, entities).event;
}

function analyze(message: string, state: DroitDynamicState) {
  return analyzeKdmInteraction(
    message,
    personality,
    state,
    canonicalSemantic(message),
  );
}

const messages = [
  "naber kaira",
  "bugün hava baya sıcak",
  "Ayşe bana salak dedi",
  "neyse boşver",
  "Merve bana iyi adamsın dedi",
  "kafam biraz bozuk",
  "sen bazen çok saçmalıyorsun",
  "tamam sakin ol",
  "özür dilerim",
  "barışalım",
  "Ayşe bana özür diledi",
  "ben öğrenciyim",
  "fenerbahçe maçı var",
  "ne diyon aq",
  "tamam anladım",
  "Mert salak herif ya",
  "bugün yoruldum",
  "merhaba yine ben",
  "iyi ki varsın",
  "neyse görüşürüz",
] as const;

describe("Kaira multi-turn architecture invariants", () => {
  it("preserves state bounds and one interaction increment across a long mixed sequence", () => {
    let state = initialState();
    let expectedInteractions = state.relationship?.interactionCount ?? 0;

    for (const message of messages) {
      const result = analyze(message, state);
      const next = result.nextDynamicState;
      expectedInteractions += 1;

      expect(next.relationship?.interactionCount).toBe(expectedInteractions);

      const stateLock = projectConversationStateLock(next);
      const behavior = buildBehaviorContract(next, result.trace);
      const report = validateStateBehaviorSeam({ state: next, behavior, stateLock });
      expect(report.issues, `${message}: ${JSON.stringify(report.issues)}`).toEqual([]);

      state = next;
    }
  });

  it("never lets a severe disengagement silently reopen on neutral turns", () => {
    let state = initialState();
    const severe = analyze("seni oropu", state);
    state = severe.nextDynamicState;
    expect(state.relationship?.conversationState).toBe("disengaged");

    for (const message of ["tamam", "neyse", "bugün hava sıcak", "konuşalım"] as const) {
      const result = analyze(message, state);
      state = result.nextDynamicState;
      expect(state.relationship?.conversationState, message).toBe("disengaged");

      const behavior = buildBehaviorContract(state, result.trace);
      const stateLock = projectConversationStateLock(state);
      expect(validateStateBehaviorSeam({ state, behavior, stateLock }).accepted).toBe(true);
    }
  });

  it("keeps third-party negativity from incrementing Kaira relationship damage", () => {
    let state = initialState();
    const before = { ...state.relationship };

    for (const message of [
      "Mert salak herif ya",
      "Ayşe bana salak dedi",
      "patron bugün çok saçmaladı",
    ] as const) {
      state = analyze(message, state).nextDynamicState;
    }

    expect(state.relationship?.negativeEvents).toBe(before.negativeEvents);
    expect(state.relationship?.hurtScore).toBe(before.hurtScore);
    expect(state.relationship?.conflictScore).toBe(before.conflictScore);
  });

  it("keeps a third-party apology in the world model without repairing Kaira-user relationship", () => {
    const state = initialState();
    const semantic = interpretSemanticEvent("Ayşe bana özür diledi");
    const entities = resolveMessageEntities("Ayşe bana özür diledi", {
      userName: "Mert",
      characterName: "KAIRO",
    });
    const grounded = groundSemanticEventForAppraisal(
      "Ayşe bana özür diledi",
      semantic,
      entities,
    );

    expect(grounded.worldEvent.eventType).toBe("apology");
    expect(grounded.worldEvent.actor?.name).toBe("Ayşe");
    expect(grounded.event.relationshipScope).toBe("third_party");
    expect(grounded.event.valence).toBe("neutral");
    expect(grounded.event.apology).toBe(false);

    const next = analyzeKdmInteraction(
      "Ayşe bana özür diledi",
      personality,
      state,
      grounded.event,
    ).nextDynamicState;

    expect(next.relationship?.warmth).toBe(state.relationship?.warmth);
    expect(next.relationship?.trust).toBe(state.relationship?.trust);
    expect(next.relationship?.repairProgress).toBe(state.relationship?.repairProgress);
    expect(next.relationship?.positiveEvents).toBe(state.relationship?.positiveEvents);
  });
});
