import { describe, expect, it } from "vitest";
import type { ReasoningTrace } from "../types/nexus";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import { validateKairoResponse } from "./kairoResponseConsistency";
import { runKairaResponseConstraintPass } from "./kairaResponseConstraintPass";

const trace = (overrides: Partial<ReasoningTrace> = {}) => ({
  messageInterpretation: { intent: "genel_sohbet", sentiment: "nötr" },
  decision: { chosenTone: "sıcak empatik", explanation: "test" },
  currentMood: { moodText: "normal", reactionMode: "neutral" },
  relationship: {
    warmthScore: 50,
    trustScore: 50,
    hurtScore: 0,
    conflictScore: 0,
    repairProgress: 0,
    interactionCount: 20,
  },
  ...overrides,
}) as ReasoningTrace;

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
  reasons: ["test"],
  resolver: "canonical",
  counterFlirtAllowed: false,
  ...overrides,
});

const neutralWorld = {
  items: [] as any[],
  context: {
    appraisal: { mayClaimNoMemory: true },
    policy: {
      mustPreserveConflict: false,
      mustPreserveReportedAttribution: false,
      mustQualify: false,
      mayAnswerFromMemory: false,
    },
  } as any,
};

const noSelfMemory = { status: "not_requested" } as any;

describe("Kaira unified response constraint pass", () => {
  it("applies world-memory fallback and then keeps that fallback inside the ResponsePlan budget", () => {
    const items = [{
      observation: {
        id: "w1",
        status: "grounded",
        kind: "reported_claim",
        event: { raw: "Mert yarın gelecek" },
      },
      score: 1,
      reasons: [],
    }] as any;
    const context = {
      appraisal: { mayClaimNoMemory: false },
      policy: {
        mustPreserveConflict: false,
        mustPreserveReportedAttribution: true,
        mustQualify: false,
        mayAnswerFromMemory: true,
      },
    } as any;

    const result = runKairaResponseConstraintPass({
      reply: "hatırlamıyorum",
      trace: trace(),
      plan: plan({ maxWords: 8 }),
      worldItems: items,
      worldContext: context,
      selfMemoryRuntime: noSelfMemory,
      epistemicContext: null,
    });

    expect(result.reply).toContain("Bana daha önce");
    expect(result.reply.split(/\s+/u).length).toBeLessThanOrEqual(8);
    expect(result.issues).toEqual([]);
    expect(result.consistency.accepted).toBe(true);
  });

  it("computes canonical consistency on the delivered text and retires chosen-tone keyword matching as an acceptance authority", () => {
    const emotionalTrace = trace({
      messageInterpretation: { intent: "duygusal_paylasim", sentiment: "üzgün" } as any,
      decision: { chosenTone: "sıcak empatik", explanation: "test" } as any,
    });
    const legacyBefore = validateKairoResponse("Mars kırmızı bir gezegendir.", emotionalTrace);
    expect(legacyBefore.accepted).toBe(false);

    const result = runKairaResponseConstraintPass({
      reply: "Mars kırmızı bir gezegendir.",
      trace: emotionalTrace,
      plan: plan(),
      worldItems: neutralWorld.items,
      worldContext: neutralWorld.context,
      selfMemoryRuntime: noSelfMemory,
      epistemicContext: {
        query: { conceptId: "mars", surface: "Mars" },
        decision: { status: "unknown", confidence: 0, source: "profile" },
      } as any,
    });

    expect(result.reply).toBe("onu bilmiyorum.");
    expect(result.consistency.mode).toBe("canonical_plan");
    expect(result.consistency.accepted).toBe(true);
    expect(result.consistency.issues).toEqual([]);
  });

  it("catches punctuation-free question acts through final plan conformance and falls back safely", () => {
    const result = runKairaResponseConstraintPass({
      reply: "sen bugün nasılsın",
      trace: trace(),
      plan: plan({ allowQuestion: false }),
      worldItems: neutralWorld.items,
      worldContext: neutralWorld.context,
      selfMemoryRuntime: noSelfMemory,
      epistemicContext: null,
    });

    expect(result.reply).toBe("tamam");
    expect(result.fallbackUsed).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.consistency.accepted).toBe(true);
  });

  it("never trusts a supplied fallback; the fallback is passed through the same ordered constraints", () => {
    const result = runKairaResponseConstraintPass({
      reply: "😘",
      trace: trace(),
      plan: plan({ counterFlirtAllowed: false, emojiBudget: 0 }),
      worldItems: neutralWorld.items,
      worldContext: neutralWorld.context,
      selfMemoryRuntime: noSelfMemory,
      epistemicContext: null,
      fallbackFactory: () => "iyi misin bugün",
    });

    expect(result.reply).toBe("tamam");
    expect(result.fallbackUsed).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.consistency.accepted).toBe(true);
  });
});
