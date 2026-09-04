import { describe, expect, it } from "vitest";
import type { ReasoningTrace } from "../types/nexus";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import {
  buildKairaDialogueObligationFallback,
  findKairaDialogueObligationIssues,
} from "./kairaDialogueObligation";
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

const plan = (overrides: Partial<KairaResponsePlan> = {}): KairaResponsePlan => ({
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

describe("final delivery obligation preservation", () => {
  it("rejects acknowledgement-only text for answer_or_clarify", () => {
    for (const reply of ["tamam", "he anladım", "peki", "aynen"]) {
      expect(findKairaDialogueObligationIssues(reply, plan())).not.toEqual([]);
    }
  });

  it("does not globally ban short acknowledgements on neighboring moves", () => {
    expect(
      findKairaDialogueObligationIssues("tamam", plan({ move: "natural_reaction" })),
    ).toEqual([]);
    expect(
      findKairaDialogueObligationIssues("he doğru", plan({ move: "acknowledge_correction" })),
    ).toEqual([]);
  });

  it("provides an explicit non-fabricating outcome for answer_or_clarify only", () => {
    expect(buildKairaDialogueObligationFallback(plan())).toBe(
      "buna şu an net cevap veremem",
    );
    expect(
      buildKairaDialogueObligationFallback(plan({ move: "natural_reaction" })),
    ).toBeNull();
  });

  it("does not let an acknowledgement fallback erase an active answer obligation", () => {
    const result = runKairaResponseConstraintPass({
      // Invalid first candidate: asks a question while this concrete plan has
      // questions disabled. This forces the canonical replacement path.
      reply: "sen ne düşünüyorsun?",
      trace,
      plan: plan(),
      worldItems: [],
      worldContext,
      selfMemoryRuntime: { status: "not_requested" } as any,
      epistemicContext: null,
      // Deliberately behaviorally empty fallback; it must be rejected by the
      // same obligation contract before delivery.
      fallbackFactory: () => "tamam",
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.reply).toBe("buna şu an net cevap veremem");
    expect(findKairaDialogueObligationIssues(result.reply, plan())).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.consistency.accepted).toBe(true);
  });

  it("preserves the legacy generic fallback on a social move where acknowledgement is valid", () => {
    const socialPlan = plan({ move: "natural_reaction" });
    const result = runKairaResponseConstraintPass({
      reply: "sen ne düşünüyorsun?",
      trace,
      plan: socialPlan,
      worldItems: [],
      worldContext,
      selfMemoryRuntime: { status: "not_requested" } as any,
      epistemicContext: null,
    });

    expect(result.reply).toBe("tamam");
    expect(result.issues).toEqual([]);
    expect(result.consistency.accepted).toBe(true);
  });
});
