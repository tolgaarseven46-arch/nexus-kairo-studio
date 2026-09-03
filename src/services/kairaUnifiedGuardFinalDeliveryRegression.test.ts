import { describe, expect, it } from "vitest";
import type { ReasoningTrace } from "../types/nexus";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import { findKairaResponsePlanIssues } from "./kairaResponsePlan";
import { runKairaResponseConstraintPass } from "./kairaResponseConstraintPass";

const trace = (): ReasoningTrace => ({
  messageInterpretation: { intent: "genel_sohbet", sentiment: "nötr" },
  decision: { chosenTone: "sıcak empatik", explanation: "regression" },
  currentMood: { moodText: "normal", reactionMode: "neutral" },
  relationship: {
    warmthScore: 50,
    trustScore: 50,
    hurtScore: 0,
    conflictScore: 0,
    repairProgress: 0,
    interactionCount: 20,
  },
} as ReasoningTrace);

const plan = (overrides: Partial<KairaResponsePlan> = {}): KairaResponsePlan => ({
  move: "natural_reaction",
  stance: "open",
  register: "balanced",
  relationshipLevel: "familiar",
  continueConversation: true,
  allowQuestion: false,
  allowHumor: false,
  allowAffection: false,
  allowForgiveness: false,
  allowReopeningCloseness: false,
  maxSentences: 1,
  maxWords: 12,
  emojiBudget: 0,
  reasons: ["regression"],
  resolver: "canonical",
  counterFlirtAllowed: false,
  ...overrides,
});

const noSelfMemory = { status: "not_requested" } as any;
const neutralWorldContext = {
  appraisal: { mayClaimNoMemory: true },
  policy: {
    mustPreserveConflict: false,
    mustPreserveReportedAttribution: false,
    mustQualify: false,
    mayAnswerFromMemory: false,
  },
} as any;

describe("Kaira unified guard final-delivery regression", () => {
  it("preserves grounded attribution while enforcing the final word budget", () => {
    const worldItems = [{
      observation: {
        id: "reported-mert",
        status: "grounded",
        kind: "reported_claim",
        event: { raw: "Mert yarın gelecek" },
      },
      score: 1,
      reasons: [],
    }] as any;
    const worldContext = {
      appraisal: { mayClaimNoMemory: false },
      policy: {
        mustPreserveConflict: false,
        mustPreserveReportedAttribution: true,
        mustQualify: false,
        mayAnswerFromMemory: true,
      },
    } as any;
    const responsePlan = plan({ maxWords: 8 });

    const result = runKairaResponseConstraintPass({
      reply: "hatırlamıyorum",
      trace: trace(),
      plan: responsePlan,
      worldItems,
      worldContext,
      selfMemoryRuntime: noSelfMemory,
      epistemicContext: null,
    });

    expect(result.reply).toContain("Bana daha önce");
    expect(result.reply.trim().split(/\s+/u).length).toBeLessThanOrEqual(8);
    expect(findKairaResponsePlanIssues(result.reply, responsePlan)).toEqual([]);
    expect(result.consistency.accepted).toBe(true);
  });

  it("revalidates an unsafe fallback instead of letting it bypass a no-question plan", () => {
    const responsePlan = plan({ allowQuestion: false });
    const unsafeFallback = "iyi misin bugün";

    const result = runKairaResponseConstraintPass({
      reply: "sen bugün nasılsın",
      trace: trace(),
      plan: responsePlan,
      worldItems: [],
      worldContext: neutralWorldContext,
      selfMemoryRuntime: noSelfMemory,
      epistemicContext: null,
      fallbackFactory: () => unsafeFallback,
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.reply).not.toBe(unsafeFallback);
    expect(findKairaResponsePlanIssues(result.reply, responsePlan)).toEqual([]);
    expect(result.consistency.accepted).toBe(true);
  });

  it("keeps epistemic unknown truth authoritative over a confident unsupported draft", () => {
    const responsePlan = plan();
    const result = runKairaResponseConstraintPass({
      reply: "Opera kesin olarak 17. yüzyılda Mars'ta ortaya çıktı.",
      trace: trace(),
      plan: responsePlan,
      worldItems: [],
      worldContext: neutralWorldContext,
      selfMemoryRuntime: noSelfMemory,
      epistemicContext: {
        query: { conceptId: "opera", surface: "opera" },
        decision: { status: "unknown", confidence: 0, source: "profile" },
      } as any,
      fallbackFactory: () => "Opera hakkında her şeyi biliyorum.",
    });

    expect(result.reply).toBe("onu bilmiyorum.");
    expect(findKairaResponsePlanIssues(result.reply, responsePlan)).toEqual([]);
    expect(result.consistency.mode).toBe("canonical_plan");
    expect(result.consistency.accepted).toBe(true);
  });
});
