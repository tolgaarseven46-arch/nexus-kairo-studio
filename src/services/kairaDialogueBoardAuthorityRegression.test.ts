import { describe, expect, it } from "vitest";
import { buildDialogueBoardInstruction } from "./kairoDialogueChaosEngine";
import { auditKairaPromptAuthorityBlocks, classifyKairaFinalProviderPromptParts } from "./kairaPromptAuthority";
import type { KairaFinalProviderPromptParts } from "./kairaFinalProviderPrompt";
import { runKairaPreAiPhase0Scenario } from "./kairaPreAiPhase0Harness";

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

describe("production Dialogue Board authority", () => {
  it("RED: production Dialogue Board is pure observational evidence, not a social-move/question authority", () => {
    const board = buildDialogueBoardInstruction([], "tamam", "Mert");
    const findings = auditKairaPromptAuthorityBlocks([
      { id: "dialogueInstruction", authorityClass: "observational_evidence", content: board },
    ]);

    expect(findings.filter((item) => item.severity === "violation")).toEqual([]);
    expect(board).not.toMatch(/en\s+doğal\s+tek\s+sosyal\s+hareketi\s+seç/iu);
    expect(board).not.toMatch(/netleştirme\s+sor/iu);
  });

  it("RED: final prompt inventory classifies the cleaned Dialogue Board as observational evidence", () => {
    const board = buildDialogueBoardInstruction([], "tamam", "Mert");
    const classified = classifyKairaFinalProviderPromptParts(emptyParts({ dialogueInstruction: board }));
    expect(classified.find((item) => item.id === "dialogueInstruction")?.authorityClass)
      .toBe("observational_evidence");
  });

  it("RED: Phase-0 harness injects the real production Dialogue Board surface", async () => {
    const result = await runKairaPreAiPhase0Scenario({
      scenarioId: "T3BOARD",
      cluster: "C",
      branchTrackType: "regression",
      title: "production Dialogue Board authority coverage",
      messages: ["tamam"],
      invariants: ["production_dialogue_board_is_observational"],
      failureClasses: ["prompt_instruction_contradiction"],
    });

    const prompt = result.turns[0].audit.finalPromptSnapshot.system;
    expect(prompt).toContain("KARMAŞIK DİYALOG TAHTASI");
    expect(result.failureClassCounts.prompt_instruction_contradiction ?? 0).toBe(0);
  });
});
