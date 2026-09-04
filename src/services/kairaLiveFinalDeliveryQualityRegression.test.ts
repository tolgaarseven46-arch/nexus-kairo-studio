import { describe, expect, it } from "vitest";
import type { ReasoningTrace } from "../types/nexus";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import { runKairaResponseConstraintPass } from "./kairaResponseConstraintPass";
import { sanitizeKairoReplyText } from "./kairoConversationGrounding";

const trace = {
  messageInterpretation: { intent: "duygusal_paylasim", sentiment: "nötr" },
  decision: { chosenTone: "sıcak empatik", explanation: "live regression" },
  currentMood: { moodText: "normal", reactionMode: "neutral" },
  relationship: {
    warmthScore: 50,
    trustScore: 50,
    hurtScore: 0,
    conflictScore: 0,
    repairProgress: 0,
    interactionCount: 3,
  },
} as ReasoningTrace;

const plan: KairaResponsePlan = {
  move: "invite_emotional_context",
  stance: "open",
  register: "balanced",
  relationshipLevel: "new",
  continueConversation: true,
  allowQuestion: true,
  allowHumor: false,
  allowAffection: false,
  allowForgiveness: false,
  allowReopeningCloseness: false,
  maxSentences: 1,
  maxWords: 3,
  emojiBudget: 0,
  reasons: ["live-30-turn-regression"],
  resolver: "canonical",
  counterFlirtAllowed: false,
};

const worldContext = {
  appraisal: { mayClaimNoMemory: true },
  policy: {
    mustPreserveConflict: false,
    mustPreserveReportedAttribution: false,
    mustQualify: false,
    mayAnswerFromMemory: false,
  },
} as any;

describe("Kaira live final-delivery quality regression", () => {
  it("never delivers the live-reproduced invalid emotional-opening draft unchanged", () => {
    const result = runKairaResponseConstraintPass({
      reply: "Hatırladığım kayda göre:",
      trace,
      plan,
      worldItems: [] as any[],
      worldContext,
      selfMemoryRuntime: { status: "not_requested" } as any,
      epistemicContext: null,
      additionalIssueFinder: (reply) =>
        /^(?:hmm\s+)?(?:niye|neden|ne oldu|noldu|hayırdır)(?:\s+ya)?[?…]*$/iu.test(reply.trim())
          ? []
          : ["İlk duygusal açılış tek kısa merak tepkisinin dışına çıktı"],
      fallbackFactory: () => "hmm niye",
    });

    expect(result.reply).toBe("hmm niye");
    expect(result.reply).not.toBe("Hatırladığım kayda göre:");
    expect(result.fallbackUsed).toBe(true);
    expect(result.consistency.accepted).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("keeps internal Kairo/Kaira reply-target labels out of visible delivery", () => {
    expect(sanitizeKairoReplyText("[Kairo → Ali]: tamam")).toBe("tamam");
    expect(sanitizeKairoReplyText("[Kaira → Ali]: tamam")).toBe("tamam");
    expect(sanitizeKairoReplyText("[Kaİra → Ali]: tamam")).toBe("tamam");
  });
});
