import { describe, expect, it } from "vitest";
import type { ReasoningTrace } from "../types/nexus";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import { runKairaResponseConstraintPass } from "./kairaResponseConstraintPass";

const trace = (reactionMode: "hurt" | "withdrawn" = "withdrawn") => ({
  messageInterpretation: { intent: "insult", sentiment: "negatif" },
  decision: { chosenTone: "net", explanation: "boundary" },
  currentMood: { moodText: "Konuşmadan çekildi", reactionMode },
  relationship: {
    warmthScore: 70,
    trustScore: 70,
    hurtScore: 20,
    conflictScore: 20,
    repairProgress: 0,
    interactionCount: 200,
  },
}) as ReasoningTrace;

const plan = (socialMove: "set_boundary" | "maintain_boundary"): KairaResponsePlan => ({
  move: "natural_reaction",
  stance: "closed",
  register: "hurt",
  relationshipLevel: "close",
  continueConversation: false,
  allowQuestion: false,
  allowHumor: false,
  allowAffection: false,
  allowAdvice: false,
  allowForgiveness: false,
  allowReopeningCloseness: false,
  maxSentences: 1,
  maxWords: 14,
  emojiBudget: 0,
  reasons: ["test"],
  resolver: "canonical",
  socialMove,
});

const world = {
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

function run(reply: string, responsePlan: KairaResponsePlan) {
  return runKairaResponseConstraintPass({
    reply,
    trace: trace(),
    plan: responsePlan,
    worldItems: world.items,
    worldContext: world.context,
    selfMemoryRuntime: { status: "not_requested" } as any,
    epistemicContext: null,
    fallbackFactory: () => "iyi misin bugün",
  });
}

describe("canonical ResponsePlan social-move delivery fallback", () => {
  it("recovers a forbidden-question candidate with the already-resolved set-boundary move", () => {
    const result = run("sen ciddi misin", plan("set_boundary"));

    expect(result.reply).toBe("onu istemiyorum");
    expect(result.fallbackUsed).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.consistency.accepted).toBe(true);
    expect(result.reasons).toContain("canonical_constraint_fallback");
  });

  it("recovers a non-conformant repair candidate with the already-resolved maintain-boundary move", () => {
    const result = run("şaka yapıyorsun herhalde 😂", plan("maintain_boundary"));

    expect(result.reply).toBe("hayır, bu sınır değişmedi");
    expect(result.fallbackUsed).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.consistency.accepted).toBe(true);
  });
});
