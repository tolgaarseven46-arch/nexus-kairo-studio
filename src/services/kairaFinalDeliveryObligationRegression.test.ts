import { describe, expect, it } from "vitest";
import type { ReasoningTrace } from "../types/nexus";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import {
  findDialogueDecisionIssues,
  planDialogueResponse,
  type DialogueDecisionPlan,
} from "./kairoDialogueDecisionEngine";
import { runKairaResponseConstraintPass } from "./kairaResponseConstraintPass";

const trace = {
  messageInterpretation: { intent: "soru", sentiment: "nötr" },
  decision: { chosenTone: "dengeli", explanation: "test" },
  currentMood: { moodText: "normal", reactionMode: "neutral" },
  relationship: {
    warmthScore: 50,
    trustScore: 50,
    hurtScore: 0,
    conflictScore: 0,
    repairProgress: 0,
    interactionCount: 1,
  },
} as ReasoningTrace;

const responsePlan = (overrides: Partial<KairaResponsePlan> = {}): KairaResponsePlan => ({
  move: "answer_or_clarify",
  stance: "open",
  register: "balanced",
  relationshipLevel: "new",
  continueConversation: true,
  allowQuestion: false,
  allowHumor: true,
  allowAffection: false,
  allowForgiveness: true,
  allowReopeningCloseness: true,
  maxSentences: 2,
  maxWords: 20,
  emojiBudget: 0,
  reasons: ["test"],
  resolver: "canonical",
  counterFlirtAllowed: false,
  ...overrides,
});

const worldContext = {
  appraisal: { mayClaimNoMemory: true },
  policy: {
    mustPreserveConflict: false,
    mustPreserveReportedAttribution: false,
    mustQualify: false,
    mayAnswerFromMemory: false,
  },
} as any;

const answerDecision = (): DialogueDecisionPlan =>
  planDialogueResponse(
    [],
    "sence abartıyor muyum?",
    "Mert",
    {
      intent: "question",
      discourseAct: "none",
      socialRoutine: "none",
      repairSignal: "none",
      adviceRequested: true,
    } as any,
  );

describe("final delivery obligation preservation", () => {
  it("makes fulfillment criteria an explicit DialogueDecision-owned output", () => {
    const decision = answerDecision();
    expect(decision.move).toBe("answer_or_clarify");
    expect(decision.obligation).toEqual({
      type: "answer_or_clarify",
      satisfactionCriteria: {
        forbiddenResponseClasses: ["acknowledgement_only"],
        allowedResolutions: [
          "fulfill_now",
          "clarify",
          "decline_explicit",
          "defer_explicit",
        ],
      },
    });
  });

  it("rejects acknowledgement-only delivery by consuming the decision-owned criterion", () => {
    const decision = answerDecision();
    for (const reply of ["tamam", "peki", "aynen", "anladım"]) {
      expect(findDialogueDecisionIssues(reply, decision)).toContain(
        "DialogueDecision obligation karşılanmadı: answer_or_clarify yalnız acknowledgement ile kapatılamaz",
      );
    }
    expect(findDialogueDecisionIssues("bence abartmıyorsun", decision)).not.toContain(
      "DialogueDecision obligation karşılanmadı: answer_or_clarify yalnız acknowledgement ile kapatılamaz",
    );
  });

  it("does not invent an obligation for neighboring social moves", () => {
    const decision = planDialogueResponse(
      [],
      "naber",
      "Mert",
      {
        intent: "general_chat",
        discourseAct: "none",
        socialRoutine: "how_are_you",
        repairSignal: "none",
        adviceRequested: false,
      } as any,
    );
    expect(decision.move).toBe("natural_reaction");
    expect(decision.obligation).toBeUndefined();
    expect(findDialogueDecisionIssues("tamam", decision)).not.toContain(
      "DialogueDecision obligation karşılanmadı: answer_or_clarify yalnız acknowledgement ile kapatılamaz",
    );
  });

  it("final guard refuses an invalid acknowledgement fallback instead of authoring a replacement", () => {
    const decision = answerDecision();
    const result = runKairaResponseConstraintPass({
      reply: "sen ne düşünüyorsun?",
      trace,
      plan: responsePlan(),
      worldItems: [],
      worldContext,
      selfMemoryRuntime: { status: "not_requested" } as any,
      epistemicContext: null,
      additionalIssueFinder: (reply) => findDialogueDecisionIssues(reply, decision),
      fallbackFactory: () => "tamam",
    });

    expect(result.fallbackUsed).toBe(false);
    expect(result.reply).toBe("sen ne düşünüyorsun?");
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.consistency.accepted).toBe(false);
  });
});
