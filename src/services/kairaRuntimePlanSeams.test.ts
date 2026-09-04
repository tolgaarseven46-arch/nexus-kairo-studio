import { describe, expect, it } from "vitest";
import { buildBehaviorContract } from "./behaviorContract";
import { understandTurkishMessage } from "./languageUnderstandingService";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import { buildKairaResponsePlan, findKairaResponsePlanIssues } from "./kairaResponsePlan";

const state = (conversationState: "active" | "distancing" = "active") => ({
  calmness: 60,
  anger: 20,
  stress: 20,
  happiness: 50,
  confidence: 60,
  surprise: 10,
  relationship: {
    conversationState,
    hurtScore: conversationState === "distancing" ? 35 : 0,
    conflictScore: 0,
    repairProgress: 0,
    repairAttempts: 0,
  },
}) as any;

const dialogue = (allowFollowUpQuestion = true) => ({
  move: "natural_reaction",
  allowFollowUpQuestion,
  allowSpeculation: false,
  maxSentences: 2,
  maxWords: 32,
  hasSupportedTargetClaim: false,
  reason: "test",
}) as any;

const speech = {
  register: "balanced",
  relationshipLevel: "new",
  sentenceLength: "short",
  slangLevel: 10,
  humorLevel: 50,
  emojiLevel: 10,
  warmthLevel: 50,
  directness: 50,
  rhythm: {},
  instructions: [],
} as any;

describe("runtime response-plan seams", () => {
  it("blocks punctuationless embedded direct questions when the plan forbids questions", () => {
    const contract = buildBehaviorContract(state("distancing"));
    const plan = buildKairaResponsePlan(contract, dialogue(false), speech);

    expect(plan.allowQuestion).toBe(false);
    expect(findKairaResponsePlanIssues("güzel, hangi maç ya", plan)).toContain(
      "response_plan_question_blocked",
    );
    expect(findKairaResponsePlanIssues("tamam peki nerede buldun", plan)).toContain(
      "response_plan_question_blocked",
    );
  });

  it("carries canonical semantic uncertainty into PlanResolver instead of using the default", async () => {
    const floor = interpretationFromRegexFloor("sg");
    const interpretation = {
      ...floor,
      uncertainty: {
        ...floor.uncertainty,
        overall: 0.75,
      },
    };
    const understanding = await understandTurkishMessage("sg", {
      incomingSemanticInterpretation: interpretation,
    });
    const contract = buildBehaviorContract(state("active"), null, understanding.event);
    const plan = buildKairaResponsePlan(contract, dialogue(true), speech);

    expect(understanding.event.semanticUncertainty).toBe(0.75);
    expect(contract.semanticUncertainty).toBe(0.75);
    expect(plan.uncertainty?.semantic).toBe(0.75);
    expect(plan.reasons.some((reason) => reason.includes("uncertainty_damping applied"))).toBe(true);
  });
});
