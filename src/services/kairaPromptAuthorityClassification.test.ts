import { describe, expect, it } from "vitest";
import {
  auditKairaFinalProviderPrompt,
  type KairaPreAiAuditInput,
} from "./kairaPreAiAudit";
import type { KairaPromptAuthorityBlock } from "./kairaFinalProviderPrompt";

function baseInput(promptBlocks: KairaPromptAuthorityBlock[]): KairaPreAiAuditInput {
  return {
    scenarioId: "AUTH1",
    branchTrackType: "regression",
    userId: "preai_AUTH1_run001",
    sessionId: "preai_session_AUTH1_run001",
    expectedUserIdPrefix: "preai_",
    expectedSessionIdPrefix: "preai_session_",
    systemPrompt: promptBlocks.map((block) => block.content).join("\n"),
    messages: [{ role: "user", content: "tamam" }],
    responsePlan: {
      allowQuestion: false,
      allowAffection: false,
      allowAdvice: false,
      requiredContent: [],
      hardReasons: ["question_forbidden"],
      maxWords: 12,
      maxSentences: 1,
    },
    promptBlocks,
  };
}

const violationCodes = (blocks: KairaPromptAuthorityBlock[]) =>
  auditKairaFinalProviderPrompt(baseInput(blocks)).invariantViolations.map((item) => item.code);

describe("typed prompt authority classification", () => {
  it("RED: catches a #260-family question directive hidden in an observational block", () => {
    expect(violationCodes([
      {
        id: "synthetic_observational_violation",
        authorityClass: "observational_evidence",
        content: "DİYALOG TAHTASI: belirsizse kısa bir netleştirme sor.",
      },
    ])).toContain("prompt_block_authority_violation");
  });

  it("RED: catches a T3-family move selection directive hidden in an observational block", () => {
    expect(violationCodes([
      {
        id: "synthetic_t3_violation",
        authorityClass: "observational_evidence",
        content: "En doğal tek sosyal hareketi seç: tepki, soru, görüş veya şaka.",
      },
    ])).toContain("prompt_block_authority_violation");
  });

  it("allows observational evidence that only describes state", () => {
    expect(violationCodes([
      {
        id: "clean_observation",
        authorityClass: "observational_evidence",
        content: "KDM BAĞLAMI: niyet=general_chat; çatışma=0; bu blok davranış izni vermez.",
      },
    ])).not.toContain("prompt_block_authority_violation");
  });

  it("allows HOW-only guidance that does not reopen a permission", () => {
    expect(violationCodes([
      {
        id: "clean_how",
        authorityClass: "how_style",
        content: "Kısa, gündelik ve az noktalı yaz. Davranış planındaki izinleri değiştirme.",
      },
    ])).not.toContain("prompt_block_authority_violation");
  });

  it("does not classify the canonical behavior authority itself as a shadow-authority violation", () => {
    expect(violationCodes([
      {
        id: "canonical_behavior",
        authorityClass: "social_behavior_authority",
        content: "allowQuestion=yasak; maxSentences=1; soru sorma.",
      },
    ])).not.toContain("prompt_block_authority_violation");
  });
});
