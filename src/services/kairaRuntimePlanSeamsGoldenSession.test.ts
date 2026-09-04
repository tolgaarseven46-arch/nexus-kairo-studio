import { describe, expect, it } from "vitest";
import { buildBehaviorContract } from "./behaviorContract";
import { buildKairaResponsePlan, findKairaResponsePlanIssues } from "./kairaResponsePlan";
import { buildKairaActivityPermissionChatPrompt } from "./kairaActivityPermissionChatRuntime";

const activeState = {
  calmness: 60,
  anger: 20,
  stress: 20,
  happiness: 50,
  confidence: 60,
  surprise: 10,
  relationship: {
    conversationState: "active",
    hurtScore: 0,
    conflictScore: 0,
    repairProgress: 0,
    repairAttempts: 0,
  },
} as any;

const distancingState = {
  ...activeState,
  relationship: {
    ...activeState.relationship,
    conversationState: "distancing",
    hurtScore: 35,
  },
} as any;

const dialogue = (allowFollowUpQuestion: boolean) => ({
  move: "natural_reaction",
  allowFollowUpQuestion,
  allowSpeculation: false,
  maxSentences: 2,
  maxWords: 32,
  hasSupportedTargetClaim: false,
  reason: "golden-session",
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

describe("runtime response-plan golden session", () => {
  it("keeps all three observed seam invariants together", () => {
    const closedQuestionPlan = buildKairaResponsePlan(
      buildBehaviorContract(distancingState),
      dialogue(false),
      speech,
    );
    expect(findKairaResponsePlanIssues("güzel, hangi maç ya", closedQuestionPlan)).toContain(
      "response_plan_question_blocked",
    );

    const uncertainPlan = buildKairaResponsePlan(
      buildBehaviorContract(activeState, null, {
        stopTalking: false,
        stopQuestions: false,
        semanticUncertainty: 0.75,
      }),
      dialogue(true),
      speech,
    );
    expect(uncertainPlan.uncertainty?.semantic).toBe(0.75);

    const permissionPrompt = buildKairaActivityPermissionChatPrompt({
      requestId: "req_golden",
      activityId: "planning_dynamic_state_chat_request_kaira_123",
      activityType: "planning_dynamic_state_chat_request_kaira",
    });
    expect(permissionPrompt.activityLabel).toBe("planladığım aktivite");
    expect(permissionPrompt.text).not.toContain("planning_dynamic_state");
  });
});
