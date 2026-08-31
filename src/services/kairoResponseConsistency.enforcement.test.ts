import { describe, expect, it } from "vitest";
import type { ReasoningTrace } from "../types/nexus";
import { enforceKairoResponse } from "./kairoResponseConsistency";

const trace = (intent = "genel_sohbet"): ReasoningTrace =>
  ({
    whoSent: { userName: "Mert", isNewUser: false, recognitionText: "test" },
    relationship: {
      warmthScore: 40,
      warmthLabel: "Mesafeli",
      trustScore: 45,
      conflictScore: 20,
      hurtScore: 25,
      repairProgress: 0,
      interactionCount: 6,
      note: "test",
    },
    currentMood: { moodText: "Konuşmadan çekildi", reasonText: "test" },
    messageInterpretation: { intent, sentiment: "nötr", explanation: "test" },
    decision: { chosenTone: "firm", explanation: "test" },
    memoryUpdate: {
      warmthBefore: 40,
      warmthAfter: 40,
      warmthDelta: 0,
      moodChange: "test",
      reason: "test",
    },
  }) as ReasoningTrace;

describe("KDM post-generation enforcement", () => {
  it("removes emoji when the speech decision forbids emoji", () => {
    const result = enforceKairoResponse("tamam sustum 😄", trace(), { emojiLevel: 0 });
    expect(result.reply).toBe("tamam sustum");
    expect(result.reasons).toContain("emoji_budget_enforced");
  });

  it("enforces final ResponsePlan emoji budget even when speech emoji level is positive", () => {
    const result = enforceKairoResponse("tamam 😄 🤝", trace(), {
      emojiLevel: 50,
      emojiBudget: 0,
    });
    expect(result.reply).toBe("tamam");
    expect(result.reasons).toContain("emoji_budget_enforced");
  });

  it("keeps only the allowed number of emoji when the final budget is positive", () => {
    const result = enforceKairoResponse("tamam 😄 🤝", trace(), {
      emojiLevel: 50,
      emojiBudget: 1,
    });
    expect((result.reply.match(/\p{Extended_Pictographic}/gu) || []).length).toBe(1);
    expect(result.reasons).toContain("emoji_budget_enforced");
  });

  it("blocks questions when KDM askQuestion is false", () => {
    const result = enforceKairoResponse("tamam. şimdi ne yapıyorsun?", trace(), {
      askQuestion: false,
    });
    expect(result.reply).toBe("tamam.");
    expect(result.reply).not.toContain("?");
  });

  it("replaces playful chat reopening while disengaged", () => {
    const result = enforceKairoResponse("hahaha hadi konuşalım 😄", trace(), {
      continueConversation: false,
      humorAllowed: false,
      askQuestion: false,
      emojiLevel: 0,
      conversationState: "disengaged",
    });
    expect(result.reply).toBe("bu şekilde devam etmeyeceğim");
    expect(result.reasons).toContain("closed_conversation_enforced");
  });

  it("uses an apology-aware boundary fallback while disengaged", () => {
    const result = enforceKairoResponse("tamam barıştık hadi ne yapıyorsun?", trace("özür_ve_telafi"), {
      continueConversation: false,
      askQuestion: false,
      conversationState: "disengaged",
    });
    expect(result.reply).toBe("özrünü duydum ama şu an konuşmak istemiyorum");
  });
});
