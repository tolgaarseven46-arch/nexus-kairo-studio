import { describe, expect, it } from "vitest";
import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";
import { buildKairaResponsePlan } from "./kairaResponsePlan";
import { buildCanonicalBehaviorBlock } from "./kairaCanonicalPromptBuilder";

const dialogue: DialogueDecisionPlan = {
  move: "natural_reaction",
  allowFollowUpQuestion: true,
  allowSpeculation: false,
  maxSentences: 2,
  maxWords: 32,
  hasSupportedTargetClaim: false,
  reason: "test",
};

const speech: KairoSpeechIdentity = {
  register: "hurt",
  relationshipLevel: "new",
  sentenceLength: "short",
  slangLevel: 0.2,
  humorLevel: 0,
  emojiLevel: 0,
  warmthLevel: 0.4,
  directness: 0.8,
  informalityLevel: 0.4,
  humorMode: "affiliative",
  rhythm: {} as KairoSpeechIdentity["rhythm"],
  emotionalDisplayLevel: 0.5,
  instructions: [],
};

const disengaged = (repairStatus: BehaviorContract["repairStatus"]): BehaviorContract => ({
  conversationState: "disengaged",
  continueConversation: false,
  playfulness: "forbidden",
  affection: "forbidden",
  questions: "forbidden",
  forgivenessGranted: false,
  repairStatus,
  reopeningCloseness: "forbidden",
  stance: "closed",
  maxResponseLength: "short",
  reasons: ["hard_disengage:test"],
});

describe("response-plan content/expression boundary regression", () => {
  it("keeps hard decisions identical while repair changes HOW only", () => {
    const boundary = buildKairaResponsePlan(disengaged("none"), dialogue, speech);
    const repair = buildKairaResponsePlan(disengaged("incomplete"), dialogue, speech);

    for (const plan of [boundary, repair]) {
      expect(plan.continueConversation).toBe(false);
      expect(plan.allowQuestion).toBe(false);
      expect(plan.allowHumor).toBe(false);
      expect(plan.allowAffection).toBe(false);
      expect(plan.allowForgiveness).toBe(false);
      expect(plan.allowReopeningCloseness).toBe(false);
      expect(plan.requiredContent).toContain("boundary_maintained");
      expect(plan.requiredContent).not.toContain("state_boundary_and_close");
    }

    expect(boundary.projections?.expressionMode).toBe("firm_boundary");
    expect(repair.projections?.expressionMode).toBe("natural_repair");
  });

  it("tells the realizer to preserve semantics without narrating internal state", () => {
    const repair = buildKairaResponsePlan(disengaged("incomplete"), dialogue, speech);
    const block = buildCanonicalBehaviorBlock(repair);

    expect(block).toContain("requiredContent=boundary_maintained");
    expect(block).toContain("HOW_PROJECTION.expressionMode=natural_repair");
    expect(block).not.toContain("state_boundary_and_close");
    expect(block).toMatch(/iç state'i, skorları veya plan gerekçesini kullanıcıya raporlama/);
    expect(block).toMatch(/Affetme veya yakınlığı yeniden açma yasağını koru/);
  });
});
