import { describe, expect, it } from "vitest";
import { buildCanonicalDialogueMoveContext } from "./kairaCanonicalPromptBuilder";
import { auditKairaFinalProviderPrompt, type KairaPreAiAuditInput } from "./kairaPreAiAudit";

function input(systemPrompt: string): KairaPreAiAuditInput {
  return {
    scenarioId: "C_SURFACE",
    branchTrackType: "regression",
    userId: "preai_C_SURFACE_run001",
    sessionId: "preai_session_C_SURFACE_run001",
    expectedUserIdPrefix: "preai_",
    expectedSessionIdPrefix: "preai_session_",
    systemPrompt,
    messages: [{ role: "user", content: "devam" }],
    responsePlan: {
      allowQuestion: false,
      allowAffection: false,
      allowAdvice: false,
      requiredContent: [],
      hardReasons: ["question_forbidden"],
      maxWords: 20,
      maxSentences: 1,
    },
  };
}

function codes(systemPrompt: string) {
  return auditKairaFinalProviderPrompt(input(systemPrompt)).invariantViolations.map((item) => item.code);
}

describe("Kaira pre-AI audit realizer instruction surface", () => {
  it("does not treat an observational clarify dialogue move as question authorization", () => {
    const prompt = [
      "=== KAIRA DAVRANIŞ PLANI — TEK VE BAĞLAYICI OTORİTE ===",
      "allowQuestion=yasak",
      buildCanonicalDialogueMoveContext("clarify", "active_user", "observational-only"),
      "REALIZER KİLİDİ: yalnız bağlayıcı planı gerçekleştir.",
    ].join("\n");

    expect(codes(prompt)).not.toContain("prompt_instruction_contradiction");
  });

  it("does not treat structured plan metadata as natural-language question authorization", () => {
    const prompt = [
      "=== KAIRA DAVRANIŞ PLANI — TEK VE BAĞLAYICI OTORİTE ===",
      "move=clarify",
      "allowQuestion=yasak",
      "REALIZER KİLİDİ: yalnız bağlayıcı planı gerçekleştir.",
    ].join("\n");

    expect(codes(prompt)).not.toContain("prompt_instruction_contradiction");
  });

  it("still rejects authoritative clarify wording when questions are forbidden", () => {
    const prompt = [
      "=== KAIRA DAVRANIŞ PLANI — TEK VE BAĞLAYICI OTORİTE ===",
      "allowQuestion=yasak",
      "Belirsizse netleştir.",
      "REALIZER KİLİDİ: yalnız bağlayıcı planı gerçekleştir.",
    ].join("\n");

    expect(codes(prompt)).toContain("prompt_instruction_contradiction");
  });
});
