import { describe, expect, it } from "vitest";
import { buildBehaviorContract } from "./behaviorContract";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import { tryLocalKairoReply } from "./kairoLocalLanguageEngine";
import { buildKairaResponsePlan, findKairaResponsePlanIssues } from "./kairaResponsePlan";
import { enforceKairoResponse } from "./kairoResponseConsistency";
import { interpretSemanticEvent } from "./semanticEventEngine";

const personality = {
  humor: 70,
  empathy: 70,
  communication: 70,
  authority: 50,
  patience: 60,
  seriousness: 50,
} as any;

const state = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 65,
  confidence: 65,
  surprise: 20,
  relationship: {
    conversationState: "active",
    hurtScore: 0,
    conflictScore: 0,
    repairProgress: 0,
    repairAttempts: 0,
    warmth: 65,
  },
} as any;

const trace = {
  decision: { chosenTone: "neutral" },
  messageInterpretation: { intent: "genel_sohbet", sentiment: "nötr" },
  currentMood: { moodText: "stabil" },
  relationship: {
    warmthScore: 65,
    trustScore: 65,
    hurtScore: 0,
    conflictScore: 0,
    repairProgress: 0,
    interactionCount: 4,
  },
} as any;

const speech = {
  register: "casual",
  relationshipLevel: "familiar",
  emojiLevel: 0,
} as any;

function pipeline(message: string) {
  const event = interpretSemanticEvent(message);
  const dialogue = planDialogueResponse([], message, "Ali", event);
  const contract = buildBehaviorContract(state, trace, event);
  const responsePlan = buildKairaResponsePlan(contract, dialogue, speech);
  const local = tryLocalKairoReply(
    message,
    personality,
    state,
    trace,
    `stop-parity-${message}`,
    dialogue.move,
    responsePlan,
    event,
  );
  return { event, dialogue, contract, responsePlan, local };
}

describe("transient explicit-stop local/AI path parity", () => {
  it("emotional opening + stopQuestions stays local but cannot ask a question", () => {
    const result = pipeline("moralim bozuk, soru sorma artık");

    expect(result.event.intent).toBe("emotional_share");
    expect(result.dialogue.move).toBe("invite_emotional_context");
    expect(result.responsePlan.continueConversation).toBe(true);
    expect(result.responsePlan.allowQuestion).toBe(false);
    expect(result.local.handled).toBe(true);
    expect(result.local.source).toBe("local_language");
    expect(result.local.reply).toBeTruthy();
    expect(result.local.reply).not.toContain("?");
    expect(findKairaResponsePlanIssues(result.local.reply!, result.responsePlan)).toEqual([]);
  });

  it("emotional opening + stopTalking cannot be reopened by the local early-return path", () => {
    const result = pipeline("moralim bozuk, sus artık");

    expect(result.event.intent).toBe("emotional_share");
    expect(result.responsePlan.continueConversation).toBe(false);
    expect(result.local.handled).toBe(false);
    expect(result.local.source).toBe("ai");

    const enforced = enforceKairoResponse(
      "hadi anlat biraz, ne oldu? 😂",
      trace,
      {
        continueConversation: result.responsePlan.continueConversation,
        humorAllowed: result.responsePlan.allowHumor,
        askQuestion: result.responsePlan.allowQuestion,
        behaviorContract: result.contract,
        emojiBudget: result.responsePlan.emojiBudget,
        conversationState: state.relationship.conversationState,
      },
    );

    expect(enforced.reply).toBe("bu şekilde devam etmeyeceğim");
    expect(findKairaResponsePlanIssues(enforced.reply, result.responsePlan)).toEqual([]);
  });

  it("greeting + stopQuestions remains locally answerable without reopening questions", () => {
    const result = pipeline("naber kaira, soru sorma artık");

    expect(result.event.intent).toBe("greeting");
    expect(result.responsePlan.continueConversation).toBe(true);
    expect(result.responsePlan.allowQuestion).toBe(false);
    expect(result.local.handled).toBe(true);
    expect(result.local.reply).toBeTruthy();
    expect(result.local.reply).not.toContain("?");
    expect(findKairaResponsePlanIssues(result.local.reply!, result.responsePlan)).toEqual([]);
  });

  it("confusion + stopQuestions stays on the AI repair path with questions forbidden", () => {
    const result = pipeline("ne diyon, soru sorma artık");

    expect(result.event.discourseAct).toBe("confusion_or_challenge");
    expect(result.dialogue.move).toBe("repair_or_rephrase");
    expect(result.responsePlan.allowQuestion).toBe(false);
    expect(result.local.handled).toBe(false);
    expect(result.local.source).toBe("ai");
  });

  it("correction + stopQuestions stays on the AI correction path with questions forbidden", () => {
    const result = pipeline("yok yanlış, soru sorma artık");

    expect(result.event.discourseAct).toBe("correction");
    expect(result.dialogue.move).toBe("acknowledge_correction");
    expect(result.responsePlan.allowQuestion).toBe(false);
    expect(result.local.handled).toBe(false);
    expect(result.local.source).toBe("ai");
  });
});
