import { describe, expect, it } from "vitest";
import { buildBehaviorContract } from "./behaviorContract";
import { enforceBehaviorContract } from "./behaviorContractEnforcer";
import { buildGroundedDialogueFallback, findDialogueDecisionIssues, type DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import { buildKairaResponsePlan, findKairaResponsePlanIssues } from "./kairaResponsePlan";

const trace = { messageInterpretation: { intent: "duygusal_paylasim" } } as any;
const speech = { register:"balanced", relationshipLevel:"new", sentenceLength:"short", slangLevel:0, humorLevel:0, emojiLevel:0, warmthLevel:20, directness:50, rhythm:{ messageLength:"short_first", bubbleFlow:"split_when_natural", punctuation:"sparse_in_casual_chat", colloquialSpelling:"light", topicTransitions:"direct" }, instructions:[] } as any;
const emotionalDialogue: DialogueDecisionPlan = { move:"invite_emotional_context", allowFollowUpQuestion:true, allowSpeculation:false, maxSentences:1, maxWords:4, hasSupportedTargetClaim:false, reason:"test" };

describe("post-enforcement final ResponsePlan delivery", () => {
  it("replaces a wider behavior-contract fallback with a plan-safe focused fallback", () => {
    const state = { calmness:50, anger:20, stress:20, happiness:40, confidence:50, surprise:0, relationship:{ conversationState:"distancing", hurtScore:35, conflictScore:15, repairProgress:0, repairAttempts:0 } } as any;
    const contract = buildBehaviorContract(state);
    const plan = buildKairaResponsePlan(contract, emotionalDialogue, speech);
    const contractResult = enforceBehaviorContract("hahaha gel sarılayım", trace, contract);
    expect(contractResult.changed).toBe(true);
    expect(findKairaResponsePlanIssues(contractResult.reply, plan)).toContain("response_plan_word_budget_exceeded");
    const fallback = buildGroundedDialogueFallback(emotionalDialogue, [], "moralim bozuk", "Ali", undefined, plan.allowQuestion);
    expect(fallback).toBe("hmm");
    expect(findDialogueDecisionIssues(fallback!, emotionalDialogue, { allowQuestion:plan.allowQuestion, emojiBudget:plan.emojiBudget, maxSentences:plan.maxSentences, maxWords:plan.maxWords })).toEqual([]);
    expect(findKairaResponsePlanIssues(fallback!, plan)).toEqual([]);
  });

  it("provides a minimal correction fallback", () => {
    const dialogue: DialogueDecisionPlan = { move:"acknowledge_correction", allowFollowUpQuestion:false, allowSpeculation:false, maxSentences:2, maxWords:8, hasSupportedTargetClaim:false, reason:"test" };
    expect(buildGroundedDialogueFallback(dialogue, [], "hayır öyle değildi", "Ali")).toBe("he doğru");
  });

  it("provides a semantically narrow fallback for rejected natural social drafts", () => {
    const dialogue: DialogueDecisionPlan = { move:"natural_reaction", allowFollowUpQuestion:false, allowSpeculation:false, maxSentences:2, maxWords:32, hasSupportedTargetClaim:false, reason:"test" };
    const fallback = buildGroundedDialogueFallback(dialogue, [], "bugün iş çok yoğundu", "Ali");
    expect(fallback).toBe("he anladım");
    expect(findDialogueDecisionIssues(fallback!, dialogue, { userMessage:"bugün iş çok yoğundu", allowQuestion:false, maxSentences:2, maxWords:32, emojiBudget:0 })).toEqual([]);
  });
});
