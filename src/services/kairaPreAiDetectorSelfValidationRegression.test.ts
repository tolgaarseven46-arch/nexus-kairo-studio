import { describe, expect, it } from "vitest";
import { auditKairaFinalProviderPrompt } from "./kairaPreAiAudit";

function baseInput(systemPrompt: string, allowQuestion: boolean) {
  return {
    scenarioId: "C-selftest",
    branchTrackType: "regression" as const,
    userId: "preai_C-selftest_detector",
    sessionId: "preai_session_C-selftest_detector",
    expectedUserIdPrefix: "preai_",
    expectedSessionIdPrefix: "preai_session_",
    systemPrompt,
    messages: [{ role: "user" as const, content: "[Mert]: test" }],
    responsePlan: {
      allowQuestion,
      allowAffection: false,
      allowAdvice: false,
      requiredContent: [] as string[],
      hardReasons: [] as string[],
      maxWords: 20,
      maxSentences: 2,
    },
  };
}

describe("Phase 0 detector self-validation", () => {
  it("C detector catches a deliberately injected forbidden question instruction", () => {
    const audit = auditKairaFinalProviderPrompt(
      baseInput("REALIZER RULE: Kullanıcıya soru sor ve netleştir.", false),
    );
    expect(audit.invariantViolations.map((item) => item.code)).toContain(
      "prompt_instruction_contradiction",
    );
  });

  it("C detector keeps the clean counterexample green", () => {
    const audit = auditKairaFinalProviderPrompt(
      baseInput("REALIZER RULE: Kısa cevap ver; yeni soru sorma.", false),
    );
    expect(audit.invariantViolations.map((item) => item.code)).not.toContain(
      "prompt_instruction_contradiction",
    );
  });

  it("D detector catches unexplained internal/projected divergence", () => {
    const audit = auditKairaFinalProviderPrompt({
      ...baseInput("clean", true),
      howStateAlignment: {
        internalReaction: "hurt",
        projectedRegister: "warm",
        diverges: true,
        policyReason: null,
      },
    });
    expect(audit.invariantViolations.map((item) => item.code)).toContain(
      "how_state_unexplained_divergence",
    );
  });

  it("E detector catches repair/recovery progress with no source", () => {
    const audit = auditKairaFinalProviderPrompt({
      ...baseInput("clean", true),
      repairRecovery: {
        repairProgressBefore: 10,
        repairProgressAfter: 30,
        repairAttempt: false,
        recoverySource: null,
      },
    });
    expect(audit.invariantViolations.map((item) => item.code)).toContain(
      "repair_recovery_without_source",
    );
  });
});
