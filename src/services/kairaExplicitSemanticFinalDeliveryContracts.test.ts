import { describe, expect, it } from "vitest";
import { buildBehaviorContract } from "./behaviorContract";
import { buildKairaResponsePlan, findKairaResponsePlanIssues } from "./kairaResponsePlan";
import { enforceKairoResponse } from "./kairoResponseConsistency";
import { interpretSemanticEvent } from "./semanticEventEngine";

const state = {
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

const trace = {
  messageInterpretation: { intent: "genel_sohbet", sentiment: "nötr" },
  decision: { chosenTone: "neutral" },
  currentMood: { moodText: "stabil" },
  relationship: {
    warmthScore: 50,
    trustScore: 50,
    hurtScore: 0,
    conflictScore: 0,
    repairProgress: 0,
    interactionCount: 3,
  },
} as any;

const dialogue = {
  move: "natural_reaction",
  allowFollowUpQuestion: true,
  allowSpeculation: false,
  maxSentences: 2,
  maxWords: 20,
  hasSupportedTargetClaim: false,
  reason: "test",
} as any;

const speech = {
  register: "casual",
  relationshipLevel: "familiar",
  emojiLevel: 1,
} as any;

function rulesFor(message: string) {
  const event = interpretSemanticEvent(message);
  const contract = buildBehaviorContract(state, trace, event);
  const plan = buildKairaResponsePlan(contract, dialogue, speech);
  return {
    event,
    contract,
    plan,
    rules: {
      continueConversation: plan.continueConversation,
      humorAllowed: plan.allowHumor,
      askQuestion: plan.allowQuestion,
      behaviorContract: contract,
      emojiBudget: plan.emojiBudget,
      conversationState: state.relationship.conversationState,
    },
  };
}

describe("explicit semantic final-delivery contracts", () => {
  it("question-only suppression does not become a false conversation shutdown", () => {
    const { plan, rules } = rulesFor("soru sorma artık");
    const result = enforceKairoResponse("neden böyle düşünüyorsun?", trace, rules);

    expect(plan.continueConversation).toBe(true);
    expect(plan.allowQuestion).toBe(false);
    expect(result.reply).toBe("tamam");
    expect(result.reply).not.toContain("devam etmeyeceğim");
    expect(findKairaResponsePlanIssues(result.reply, plan)).toEqual([]);
  });

  it("stop-talking remains hard-closed through deterministic final delivery", () => {
    const { plan, rules } = rulesFor("sus artık");
    const result = enforceKairoResponse("hahaha hadi konuşalım mı 😂", trace, rules);

    expect(plan.continueConversation).toBe(false);
    expect(result.reply).toBe("bu şekilde devam etmeyeceğim");
    expect(result.reply).not.toMatch(/[?😂🤣😏]/u);
    expect(findKairaResponsePlanIssues(result.reply, plan)).toEqual([]);
  });
});
