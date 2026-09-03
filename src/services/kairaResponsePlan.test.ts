import { describe, expect, it } from "vitest";
import { buildBehaviorContract } from "./behaviorContract";
import { buildKairaResponsePlan, findKairaResponsePlanIssues } from "./kairaResponsePlan";

const dialogue = (overrides: Record<string, unknown> = {}) => ({
  move: "natural_reaction",
  allowFollowUpQuestion: false,
  allowSpeculation: false,
  maxSentences: 2,
  hasSupportedTargetClaim: false,
  reason: "test",
  ...overrides,
}) as any;

const speech = (overrides: Record<string, unknown> = {}) => ({
  register: "balanced",
  relationshipLevel: "new",
  sentenceLength: "short",
  slangLevel: 10,
  humorLevel: 50,
  emojiLevel: 10,
  warmthLevel: 50,
  directness: 50,
  rhythm: {
    messageLength: "short_first",
    bubbleFlow: "split_when_natural",
    punctuation: "sparse_in_casual_chat",
    colloquialSpelling: "light",
    topicTransitions: "direct",
  },
  instructions: [],
  ...overrides,
}) as any;

const state = (
  conversationState: "active" | "distancing" | "disengaged" | "repairing",
  extra: Record<string, unknown> = {},
) => ({
  calmness: 60,
  anger: 20,
  stress: 20,
  happiness: 50,
  confidence: 60,
  surprise: 10,
  relationship: {
    conversationState,
    hurtScore: 0,
    conflictScore: 0,
    repairProgress: 0,
    repairAttempts: 0,
    ...extra,
  },
}) as any;

describe("KairaResponsePlan", () => {
  it("intersects dialogue permission with behavior contract instead of widening it", () => {
    const contract = buildBehaviorContract(state("distancing", { hurtScore: 35 }));
    const plan = buildKairaResponsePlan(
      contract,
      dialogue({ allowFollowUpQuestion: true }),
      speech({ humorLevel: 90, emojiLevel: 20 }),
    );

    expect(plan.allowQuestion).toBe(false);
    expect(plan.allowHumor).toBe(false);
    expect(plan.allowAffection).toBe(false);
    expect(plan.allowForgiveness).toBe(false);
    expect(plan.emojiBudget).toBe(0);
    expect(plan.maxSentences).toBe(1);
  });

  it("allows a question only when both dialogue and contract allow it", () => {
    const contract = buildBehaviorContract(state("active"));
    const plan = buildKairaResponsePlan(
      contract,
      dialogue({ allowFollowUpQuestion: true }),
      speech(),
    );

    expect(plan.allowQuestion).toBe(true);
  });

  it("keeps active positive repair progress open instead of inventing relationship damage", () => {
    const contract = buildBehaviorContract(
      state("active", { hurtScore: 0, conflictScore: 0, repairProgress: 12 }),
    );
    const plan = buildKairaResponsePlan(
      contract,
      dialogue({
        move: "invite_emotional_context",
        allowFollowUpQuestion: true,
        maxSentences: 1,
        maxWords: 4,
      }),
      speech(),
    );

    expect(contract.stance).toBe("open");
    expect(contract.questions).toBe("allowed");
    expect(contract.reasons).not.toContain(
      "Çözülmemiş ilişki hasarı var; sıcak/oyuncu yeniden yakınlaşma ve kesin affetme engellendi.",
    );
    expect(plan.allowQuestion).toBe(true);
    // Canonical resolver may shrink a dialogue ceiling from verbosity tendency,
    // but can never widen it beyond the dialogue/contract hard maximum.
    expect(plan.maxWords).toBeGreaterThanOrEqual(1);
    expect(plan.maxWords).toBeLessThanOrEqual(4);
  });

  it("does not let HOW-only humor style veto an allowed behavior permission", () => {
    const contract = buildBehaviorContract(state("active"));
    const plan = buildKairaResponsePlan(
      contract,
      dialogue(),
      speech({ humorLevel: 0 }),
    );

    expect(contract.playfulness).toBe("allowed");
    expect(plan.allowHumor).toBe(true);
  });

  it("lets dialogue authority narrow social permissions for first emotional opening", () => {
    const contract = buildBehaviorContract(state("active"));
    const plan = buildKairaResponsePlan(
      contract,
      dialogue({ move: "invite_emotional_context", allowFollowUpQuestion: true, maxSentences: 1, maxWords: 4 }),
      speech({ humorLevel: 100 }),
    );

    expect(contract.playfulness).toBe("allowed");
    expect(contract.affection).toBe("allowed");
    expect(contract.forgivenessGranted).toBe(true);
    expect(contract.reopeningCloseness).toBe("allowed");
    expect(plan.allowQuestion).toBe(true);
    expect(plan.allowHumor).toBe(false);
    expect(plan.allowAffection).toBe(false);
    expect(plan.allowForgiveness).toBe(false);
    expect(plan.allowReopeningCloseness).toBe(false);
    expect(findKairaResponsePlanIssues("şaka yapıyorum hehe", plan)).toContain(
      "response_plan_humor_blocked",
    );
    expect(findKairaResponsePlanIssues("gel sarılayım", plan)).toContain(
      "response_plan_affection_blocked",
    );
    expect(findKairaResponsePlanIssues("sorun yok", plan)).toContain(
      "response_plan_forgiveness_blocked",
    );
    expect(findKairaResponsePlanIssues("hadi devam edelim", plan)).toContain(
      "response_plan_reopening_blocked",
    );
  });

  it("lets dialogue authority narrow social permissions for focused repair/recall moves", () => {
    const contract = buildBehaviorContract(state("active"));

    for (const move of ["repair_or_rephrase", "grounded_recall", "follow_previous_answer", "acknowledge_correction"] as const) {
      const plan = buildKairaResponsePlan(
        contract,
        dialogue({ move }),
        speech({ humorLevel: 100 }),
      );
      expect(plan.allowHumor, move).toBe(false);
      expect(plan.allowAffection, move).toBe(false);
      expect(plan.allowForgiveness, move).toBe(false);
      expect(plan.allowReopeningCloseness, move).toBe(false);
    }
  });

  it("makes focused dialogue and banter emoji-free even when speech style prefers emoji", () => {
    const contract = buildBehaviorContract(state("active"));
    for (const move of ["invite_emotional_context", "grounded_recall", "repair_or_rephrase", "follow_previous_answer", "acknowledge_correction", "join_banter"] as const) {
      const plan = buildKairaResponsePlan(
        contract,
        dialogue({ move }),
        speech({ emojiLevel: 100 }),
      );
      expect(plan.emojiBudget, move).toBe(0);
    }
  });

  it("keeps emoji as HOW quantity when an unrestricted move and open contract allow it", () => {
    const contract = buildBehaviorContract(state("active"));
    const plan = buildKairaResponsePlan(
      contract,
      dialogue({ move: "natural_reaction" }),
      speech({ emojiLevel: 10 }),
    );
    expect(plan.emojiBudget).toBe(1);
  });

  it("hard-closes disengaged state regardless of speech warmth", () => {
    const contract = buildBehaviorContract(state("disengaged", { hurtScore: 80 }));
    const plan = buildKairaResponsePlan(
      contract,
      dialogue({ allowFollowUpQuestion: true }),
      speech({ register: "casual", humorLevel: 100, emojiLevel: 20 }),
    );

    expect(plan.continueConversation).toBe(false);
    expect(plan.allowQuestion).toBe(false);
    expect(plan.allowHumor).toBe(false);
    expect(plan.allowReopeningCloseness).toBe(false);
  });

  it("validator uses the same plan for question, forgiveness and emoji limits", () => {
    const contract = buildBehaviorContract(state("distancing", { hurtScore: 35 }));
    const plan = buildKairaResponsePlan(contract, dialogue(), speech());
    const issues = findKairaResponsePlanIssues("sorun yok 😏 devam edelim?", plan);

    expect(issues).toContain("response_plan_question_blocked");
    expect(issues).toContain("response_plan_humor_blocked");
    expect(issues).toContain("response_plan_forgiveness_blocked");
    expect(issues).toContain("response_plan_reopening_blocked");
    expect(issues).toContain("response_plan_emoji_budget_exceeded");
  });
});
