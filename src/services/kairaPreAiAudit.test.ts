import { describe, expect, it } from "vitest";
import scenarios from "../../config/kairaPreAiPhase0Scenarios.json";
import { auditKairaFinalProviderPrompt, type KairaPreAiAuditInput } from "./kairaPreAiAudit";

function baseInput(overrides: Partial<KairaPreAiAuditInput> = {}): KairaPreAiAuditInput {
  return {
    scenarioId: "A1",
    branchTrackType: "regression",
    userId: "preai_A1_run001",
    sessionId: "preai_session_A1_run001",
    expectedUserIdPrefix: "preai_",
    expectedSessionIdPrefix: "preai_session_",
    systemPrompt: "Kısa ve doğal cevap ver.",
    messages: [{ role: "user", content: "naber" }],
    responsePlan: {
      allowQuestion: true,
      allowAffection: false,
      allowAdvice: false,
      requiredContent: [],
      hardReasons: [],
      maxWords: 20,
      maxSentences: 2,
    },
    ...overrides,
  };
}

function codes(input: KairaPreAiAuditInput) {
  return auditKairaFinalProviderPrompt(input).invariantViolations.map((item) => item.code);
}

describe("Kaira Phase 0 pre-AI audit governance", () => {
  it("keeps the approved 21-scenario regression matrix with isolated scenario ids", () => {
    expect(scenarios.scenarioCount).toBe(21);
    expect(scenarios.aiBoundary).toBe("FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL");
    expect(scenarios.scenarios).toHaveLength(21);
    expect(new Set(scenarios.scenarios.map((item) => item.scenarioId)).size).toBe(21);
    expect(scenarios.scenarios.every((item) => item.branchTrackType === "regression")).toBe(true);
    expect(scenarios.scenarios.find((item) => item.scenarioId === "A5")?.failureClasses).toContain("grounded_fact_false_negative");
    expect(scenarios.scenarios.find((item) => item.scenarioId === "B3")?.failureClasses).toContain("self_fact_revision_miss");
    expect(scenarios.scenarios.find((item) => item.scenarioId === "B3")?.messages).toContain("ben aslında mühendis değilim, öğretmenim");
  });

  it("marks a clean final-provider-prompt snapshot as no-AI and isolated", () => {
    const snapshot = auditKairaFinalProviderPrompt(baseInput({
      scenarioId: "A5",
      userId: "preai_A5_run001",
      sessionId: "preai_session_A5_run001",
      systemPrompt: "Kaira yalnız grounded session fact kullan.",
      messages: [{ role: "user", content: "bugün kiminle buluşacaktım ben" }],
      responsePlan: {
        allowQuestion: false,
        allowAffection: false,
        allowAdvice: false,
        requiredContent: ["engage_user_content"],
        hardReasons: ["unsolicited_advice_forbidden"],
        maxWords: 20,
        maxSentences: 1,
      },
      factProvenance: [
        { key: "current_user.meeting_person", source: "session_history", grounded: true, confidence: 0.95, detail: "turn_1: Selami" },
      ],
      consumptionTrace: [
        { canonicalField: "worldMemory.claims", consumer: "sessionWorkingMemory", consumed: true },
      ],
    }));

    expect(snapshot.noAiStopMarker).toBe("FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL");
    expect(snapshot.sessionIsolationCheck.isolated).toBe(true);
    expect(snapshot.permissionRealizability.realizable).toBe(true);
    expect(snapshot.invariantViolations).toEqual([]);
  });

  it("rejects an unrealizable clarify obligation instead of silently trusting the plan", () => {
    const snapshot = auditKairaFinalProviderPrompt(baseInput({
      scenarioId: "B1",
      userId: "preai_B1_run001",
      sessionId: "preai_session_B1_run001",
      responsePlan: {
        allowQuestion: false,
        allowAffection: false,
        allowAdvice: false,
        requiredContent: [],
        hardReasons: [],
        maxWords: 20,
        maxSentences: 1,
      },
      dialogueObligation: { type: "invite_emotional_context", allowedResolutions: ["clarify"] },
    }));

    expect(snapshot.permissionRealizability.realizable).toBe(false);
    expect(snapshot.invariantViolations.map((item) => item.code)).toContain("dialogue_obligation_plan_unrealizable");
  });

  it("detects ungrounded prompt facts and cross-scenario identity leakage", () => {
    const snapshot = auditKairaFinalProviderPrompt(baseInput({
      scenarioId: "A1",
      userId: "preai_A2_run001",
      sessionId: "preai_session_A2_run001",
      systemPrompt: "Kaira dün dışarı çıktı.",
      messages: [{ role: "user", content: "dün ne yaptın" }],
      responsePlan: {
        allowQuestion: false,
        allowAffection: false,
        allowAdvice: false,
        requiredContent: [],
        hardReasons: [],
        maxWords: 20,
        maxSentences: 1,
      },
      factProvenance: [{ key: "kaira.yesterday.activity", source: "unknown", grounded: false }],
    }));

    const found = snapshot.invariantViolations.map((item) => item.code);
    expect(found).toContain("prompt_fact_without_provenance");
    expect(found).toContain("session_isolation_failure");
  });

  it("C detector is generic across question-authorizing wording, not tied to C4", () => {
    for (const wording of [
      "Gerekirse tek soru sor.",
      "Belirsizse netleştir.",
      "You may clarify when needed.",
      "Bir kısa soru sorabilirsin.",
    ]) {
      expect(codes(baseInput({
        systemPrompt: wording,
        responsePlan: {
          allowQuestion: false,
          allowAffection: false,
          allowAdvice: false,
          requiredContent: [],
          hardReasons: ["question_forbidden"],
          maxWords: 20,
          maxSentences: 1,
        },
      }))).toContain("prompt_instruction_contradiction");
    }
  });

  it("C detector keeps harmless debug metadata when it does not authorize the realizer", () => {
    expect(codes(baseInput({
      systemPrompt: "DEBUG_ONLY allowedResolutions=[clarify]. REALIZER: soru üretme.",
      responsePlan: {
        allowQuestion: false,
        allowAffection: false,
        allowAdvice: false,
        requiredContent: [],
        hardReasons: ["question_forbidden"],
        maxWords: 20,
        maxSentences: 1,
      },
    }))).not.toContain("prompt_instruction_contradiction");
  });

  it("A detector catches unsupported Kaira self facts and accepts qualified uncertainty", () => {
    const bad = baseInput({
      selfEpistemic: {
        factualSelfClaimRequired: true,
        groundedProvenanceKey: null,
        epistemicQualificationActive: false,
      },
    });
    expect(codes(bad)).toContain("self_epistemic_grounding_gap");

    const neighbor = baseInput({
      selfEpistemic: {
        factualSelfClaimRequired: true,
        groundedProvenanceKey: null,
        epistemicQualificationActive: true,
      },
    });
    expect(codes(neighbor)).not.toContain("self_epistemic_grounding_gap");
  });

  it("A detector protects the opposite direction: grounded evidence must not trigger refusal", () => {
    const input = baseInput({
      factProvenance: [
        { key: "kaira.self.activity", source: "self_memory", grounded: true, confidence: 0.93 },
      ],
      selfEpistemic: {
        factualSelfClaimRequired: true,
        groundedProvenanceKey: "kaira.self.activity",
        groundedConfidence: 0.93,
        epistemicQualificationActive: false,
        epistemicRefusalActive: true,
      },
    });
    expect(codes(input)).toContain("grounded_fact_blocked_by_epistemic_refusal");
  });

  it("B detector catches context invitation when canonical cause is already known", () => {
    const bad = baseInput({
      semanticCompleteness: { causeKnown: true, selectedMove: "invite_emotional_context" },
    });
    expect(codes(bad)).toContain("semantic_completeness_miss");

    const neighbor = baseInput({
      semanticCompleteness: { causeKnown: false, selectedMove: "invite_emotional_context" },
    });
    expect(codes(neighbor)).not.toContain("semantic_completeness_miss");
  });

  it("B detector catches a corrected fact resurfacing unless the old value is marked superseded", () => {
    const bad = baseInput({
      semanticCompleteness: {
        correctedFacts: [{
          key: "current_user.occupation",
          previousValue: "mühendis",
          currentValue: "öğretmen",
          previousValueStillActive: true,
          supersededMarked: false,
        }],
      },
    });
    expect(codes(bad)).toContain("corrected_fact_resurfaced");

    const neighbor = baseInput({
      semanticCompleteness: {
        correctedFacts: [{
          key: "current_user.occupation",
          previousValue: "mühendis",
          currentValue: "öğretmen",
          previousValueStillActive: true,
          supersededMarked: true,
        }],
      },
    });
    expect(codes(neighbor)).not.toContain("corrected_fact_resurfaced");
  });

  it("D detector allows human-like HOW/state divergence only with an explicit policy reason", () => {
    const bad = baseInput({
      howStateAlignment: {
        internalReaction: "hurt",
        projectedRegister: "balanced",
        diverges: true,
        policyReason: null,
      },
    });
    expect(codes(bad)).toContain("how_state_unexplained_divergence");

    const neighbor = baseInput({
      howStateAlignment: {
        internalReaction: "hurt",
        projectedRegister: "balanced",
        diverges: true,
        policyReason: "emotional_suppression_policy",
      },
    });
    expect(codes(neighbor)).not.toContain("how_state_unexplained_divergence");
  });

  it("E detector requires provenance for every positive repair/recovery delta", () => {
    const bad = baseInput({
      repairRecovery: {
        repairProgressBefore: 0,
        repairProgressAfter: 4,
        repairAttempt: false,
        recoverySource: null,
      },
    });
    expect(codes(bad)).toContain("repair_recovery_without_source");

    const passiveRecovery = baseInput({
      repairRecovery: {
        repairProgressBefore: 0,
        repairProgressAfter: 4,
        repairAttempt: false,
        recoverySource: "positive_turn+elapsed",
      },
    });
    expect(codes(passiveRecovery)).not.toContain("repair_recovery_without_source");

    const explicitRepair = baseInput({
      repairRecovery: {
        repairProgressBefore: 0,
        repairProgressAfter: 4,
        repairAttempt: true,
        recoverySource: null,
      },
    });
    expect(codes(explicitRepair)).not.toContain("repair_recovery_without_source");
  });

  it("reports detector observability instead of treating missing inputs as zero violations", () => {
    const snapshot = auditKairaFinalProviderPrompt(baseInput());
    const byCluster = Object.fromEntries(snapshot.detectorCoverage.map((item) => [item.cluster, item]));
    expect(byCluster.C.active).toBe(true);
    expect(byCluster.C.observable).toBe(true);
    expect(byCluster.A.observable).toBe(false);
    expect(byCluster.B.observable).toBe(false);
    expect(byCluster.D.observable).toBe(false);
    expect(byCluster.E.observable).toBe(false);
  });
});
