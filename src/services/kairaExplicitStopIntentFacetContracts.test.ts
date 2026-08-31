import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { chooseKairoDialoguePlan } from "./kairoDialogueDecisionEngine";

const context = {
  personality: { humor: 50, empathy: 50, communication: 50 } as any,
  dynamicState: {
    calmness: 70,
    anger: 10,
    stress: 20,
    happiness: 60,
    confidence: 60,
    surprise: 20,
    relationship: {
      conversationState: "active",
      hurtScore: 0,
      conflictScore: 0,
      repairProgress: 0,
      repairAttempts: 0,
    },
  } as any,
  history: [] as any[],
};

describe("explicit stop intent-facet contracts", () => {
  it("standalone stop commands remain complaints while carrying explicit facets", () => {
    const stopQuestions = interpretSemanticEvent("soru sorma artık");
    const stopTalking = interpretSemanticEvent("sus artık");

    expect(stopQuestions.intent).toBe("complaint");
    expect(stopQuestions.stopQuestions).toBe(true);
    expect(stopQuestions.stopTalking).toBe(false);

    expect(stopTalking.intent).toBe("complaint");
    expect(stopTalking.stopTalking).toBe(true);
  });

  it("question suppression does not erase an emotional-share primary intent", () => {
    const event = interpretSemanticEvent("moralim bozuk, soru sorma artık");
    const plan = chooseKairoDialoguePlan({
      ...context,
      userMessage: event.raw,
      semanticEvent: event,
    } as any);

    expect(event.intent).toBe("emotional_share");
    expect(event.socialRoutine).toBe("emotional_opening");
    expect(event.stopQuestions).toBe(true);
    expect(plan.move).toBe("invite_emotional_context");
  });

  it("stop-talking remains a facet without erasing emotional content", () => {
    const event = interpretSemanticEvent("moralim bozuk, sus artık");

    expect(event.intent).toBe("emotional_share");
    expect(event.emotionalLoad).toBeGreaterThan(0.5);
    expect(event.stopTalking).toBe(true);
  });

  it("greeting remains the primary intent when paired with question suppression", () => {
    const event = interpretSemanticEvent("naber kaira, soru sorma artık");

    expect(event.intent).toBe("greeting");
    expect(event.stopQuestions).toBe(true);
  });
});
