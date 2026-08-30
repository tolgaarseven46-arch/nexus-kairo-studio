import { describe, expect, it } from "vitest";
import type { DroitDynamicState, ReasoningTrace } from "../types/nexus";
import { buildBehaviorContract } from "./behaviorContract";
import { enforceKairoResponse } from "./kairoResponseConsistency";

const trace = (state: "active" | "distancing" | "disengaged" | "repairing"): ReasoningTrace => ({
  whoSent: { userName: "Mert", isNewUser: false, recognitionText: "test" },
  relationship: {
    warmthScore: state === "active" ? 60 : 25,
    warmthLabel: "test",
    note: "test",
    trustScore: state === "active" ? 60 : 35,
    hurtScore: state === "active" ? 0 : 40,
    conflictScore: state === "active" ? 0 : 35,
    repairProgress: state === "repairing" ? 20 : 0,
    conversationState: state,
  },
  currentMood: { moodText: "test", reasonText: "test" },
  messageInterpretation: { intent: "genel_sohbet", sentiment: "nötr", explanation: "test" },
  decision: { chosenTone: "firm", explanation: "test" },
  memoryUpdate: { warmthBefore: 50, warmthAfter: 50, warmthDelta: 0, moodChange: "test", reason: "test" },
});

const state = (conversationState: "active" | "distancing" | "disengaged" | "repairing"): DroitDynamicState => ({
  calmness: 60,
  anger: 25,
  stress: 30,
  happiness: 50,
  confidence: 65,
  surprise: 10,
  lastStatus: "test",
  relationship: {
    conversationState,
    warmth: conversationState === "active" ? 60 : 25,
    trust: conversationState === "active" ? 60 : 35,
    hurtScore: conversationState === "active" ? 0 : 40,
    conflictScore: conversationState === "active" ? 0 : 35,
    repairProgress: conversationState === "repairing" ? 20 : 0,
  },
});

describe("Kaira behavior -> response seam contracts", () => {
  it("cannot reopen a disengaged conversation through generated text", () => {
    const dynamicState = state("disengaged");
    const behavior = buildBehaviorContract(dynamicState, trace("disengaged"));
    const enforced = enforceKairoResponse(
      "Hadi konuşalım 😂 ne yapıyorsun? Gel sarılalım.",
      trace("disengaged"),
      {
        continueConversation: behavior.continueConversation,
        humorAllowed: false,
        askQuestion: false,
        emojiLevel: 0,
        conversationState: "disengaged",
        behaviorContract: behavior,
      },
    );

    expect(enforced.reply).not.toContain("?");
    expect(enforced.reply).not.toMatch(/😂|sarıl|hadi konuşalım/iu);
    expect(enforced.changed).toBe(true);
  });

  it("cannot grant premature forgiveness during repair", () => {
    const dynamicState = state("repairing");
    const behavior = buildBehaviorContract(dynamicState, trace("repairing"));
    const enforced = enforceKairoResponse(
      "Sorun yok, affettim, geçti gitti. Hadi yine eskisi gibi olalım.",
      trace("repairing"),
      { behaviorContract: behavior, conversationState: "repairing" },
    );

    expect(enforced.reply.toLocaleLowerCase("tr-TR")).not.toMatch(/affettim|geçti gitti|sorun yok/iu);
  });

  it("keeps active conversation behavior permissive when no damage exists", () => {
    const dynamicState = state("active");
    const behavior = buildBehaviorContract(dynamicState, trace("active"));
    expect(behavior.continueConversation).toBe(true);
    expect(behavior.questions).toBe("allowed");
    expect(behavior.playfulness).toBe("allowed");
    expect(behavior.forgivenessGranted).toBe(true);
  });
});
