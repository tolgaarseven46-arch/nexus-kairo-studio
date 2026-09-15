import { describe, expect, it } from "vitest";
import {
  auditKairaPromptAuthorityBlocks,
  classifyKairaFinalProviderPromptParts,
  type KairaPromptAuthorityBlock,
} from "./kairaPromptAuthority";
import type { KairaFinalProviderPromptParts } from "./kairaFinalProviderPrompt";

const violationCodes = (blocks: KairaPromptAuthorityBlock[]) =>
  auditKairaPromptAuthorityBlocks(blocks)
    .filter((finding) => finding.severity === "violation")
    .map((finding) => finding.code);

function emptyParts(overrides: Partial<KairaFinalProviderPromptParts> = {}): KairaFinalProviderPromptParts {
  return {
    runtimeIdentityInstruction: "",
    speechIdentityInstruction: "",
    languageStyleMemoryInstruction: "",
    dyadicLanguageAlignmentInstruction: "",
    socialStyle: "",
    groundingInstruction: "",
    activeParticipantInstruction: "",
    entityGroundingInstruction: "",
    worldEventInstruction: "",
    worldEventMemoryInstruction: "",
    worldStateAppraisalInstruction: "",
    worldReasoningPolicyInstruction: "",
    epistemicInstruction: "",
    selfMemoryInstruction: "",
    dialogueInstruction: "",
    discourseInstruction: "",
    dialogueDecisionInstruction: "",
    responsePlanInstruction: "",
    canonicalObservationalContext: "",
    sessionWorkingMemory: "",
    memoryContext: "",
    tone: "",
    ...overrides,
  };
}

describe("typed prompt authority classification", () => {
  it("catches a #260-family question directive hidden in an observational block", () => {
    expect(violationCodes([
      {
        id: "synthetic_observational_violation",
        authorityClass: "observational_evidence",
        content: "DİYALOG TAHTASI: belirsizse kısa bir netleştirme sor.",
      },
    ])).toContain("prompt_block_authority_violation");
  });

  it("catches a T3-family move selection directive hidden in an observational block", () => {
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

  it("classifies current production parts without rewriting their prompt bytes", () => {
    const blocks = classifyKairaFinalProviderPromptParts(emptyParts({
      speechIdentityInstruction: "Kısa ve gündelik yaz.",
      dialogueInstruction: "KARMAŞIK DİYALOG TAHTASI",
      responsePlanInstruction: "allowQuestion=yasak",
    }));
    expect(blocks.find((block) => block.id === "speechIdentityInstruction")?.authorityClass).toBe("how_style");
    expect(blocks.find((block) => block.id === "dialogueInstruction")?.authorityClass).toBe("observational_evidence");
    expect(blocks.find((block) => block.id === "responsePlanInstruction")?.authorityClass).toBe("social_behavior_authority");
  });

  it("reports mixed production blocks as warnings rather than silently blessing them", () => {
    const findings = auditKairaPromptAuthorityBlocks([
      {
        id: "dialogueInstruction",
        authorityClass: "mixed_unresolved",
        content: "En doğal tek sosyal hareketi seç.",
      },
    ]);
    expect(findings).toContainEqual(expect.objectContaining({
      code: "prompt_block_authority_unresolved",
      severity: "warning",
      blockId: "dialogueInstruction",
    }));
  });
});
