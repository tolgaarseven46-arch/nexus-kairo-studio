import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildBehaviorContract } from "./behaviorContract";
import { buildKairaResponsePlan } from "./kairaResponsePlan";
import { interpretSemanticEvent } from "./semanticEventEngine";

const activeState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 20,
  relationship: {
    conversationState: "active",
    hurtScore: 0,
    conflictScore: 0,
    repairProgress: 0,
    repairAttempts: 0,
  },
} as any;

const dialogue = {
  move: "respond",
  allowFollowUpQuestion: true,
  maxSentences: 2,
  maxWords: 28,
  reason: "test",
} as any;

const speech = {
  register: "casual",
  relationshipLevel: "familiar",
  emojiLevel: 1,
} as any;

describe("explicit semantic response-plan authority", () => {
  it("stop-talking closes only the current response plan without persisting disengaged state", () => {
    const event = interpretSemanticEvent("sus artık");
    const contract = buildBehaviorContract(activeState, null, event);
    const plan = buildKairaResponsePlan(contract, dialogue, speech);

    expect(event.stopTalking).toBe(true);
    expect(contract.conversationState).toBe("active");
    expect(contract.continueConversation).toBe(false);
    expect(contract.stance).toBe("closed");
    expect(contract.questions).toBe("forbidden");
    expect(contract.playfulness).toBe("forbidden");
    expect(contract.reopeningCloseness).toBe("forbidden");
    expect(plan.continueConversation).toBe(false);
    expect(plan.allowQuestion).toBe(false);
    expect(plan.allowHumor).toBe(false);
    expect(plan.allowAffection).toBe(false);
    expect(plan.allowForgiveness).toBe(false);
    expect(plan.allowReopeningCloseness).toBe(false);
    expect(plan.maxSentences).toBe(1);
  });

  it("stop-questions narrows questions while leaving an otherwise active conversation open", () => {
    const event = interpretSemanticEvent("soru sorma artık");
    const contract = buildBehaviorContract(activeState, null, event);
    const plan = buildKairaResponsePlan(contract, dialogue, speech);

    expect(event.stopQuestions).toBe(true);
    expect(event.stopTalking).toBe(false);
    expect(contract.continueConversation).toBe(true);
    expect(contract.questions).toBe("forbidden");
    expect(plan.continueConversation).toBe(true);
    expect(plan.allowQuestion).toBe(false);
  });

  it("server passes the canonical semantic event into the behavior contract", async () => {
    const source = await readFile("server.ts", "utf8");
    expect(source).toContain(
      "buildBehaviorContract(kdm.nextDynamicState, kdm.trace, canonicalSemantic.event)",
    );
  });
});
