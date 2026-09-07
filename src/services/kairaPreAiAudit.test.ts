import { describe, expect, it } from "vitest";
import scenarios from "../../config/kairaPreAiPhase0Scenarios.json";
import { auditKairaFinalProviderPrompt } from "./kairaPreAiAudit";

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
    const snapshot = auditKairaFinalProviderPrompt({
      scenarioId: "A5",
      branchTrackType: "regression",
      userId: "preai_A5_run001",
      sessionId: "preai_session_A5_run001",
      expectedUserIdPrefix: "preai_",
      expectedSessionIdPrefix: "preai_session_",
      systemPrompt: "Kaira yalnız grounded session fact kullan. Soru ekleme.",
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
        { key: "current_user.meeting_person", source: "session_history", grounded: true, detail: "turn_1: Selami" },
      ],
      consumptionTrace: [
        { canonicalField: "worldMemory.claims", consumer: "sessionWorkingMemory", consumed: true },
      ],
    });

    expect(snapshot.noAiStopMarker).toBe("FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL");
    expect(snapshot.sessionIsolationCheck.isolated).toBe(true);
    expect(snapshot.permissionRealizability.realizable).toBe(true);
    expect(snapshot.invariantViolations).toEqual([]);
  });

  it("rejects an unrealizable clarify obligation instead of silently trusting the plan", () => {
    const snapshot = auditKairaFinalProviderPrompt({
      scenarioId: "B1",
      branchTrackType: "regression",
      userId: "preai_B1_run001",
      sessionId: "preai_session_B1_run001",
      systemPrompt: "Kısa cevap ver.",
      messages: [{ role: "user", content: "bugün çok mutluyum çünkü işe kabul edildim" }],
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
    });

    expect(snapshot.permissionRealizability.realizable).toBe(false);
    expect(snapshot.invariantViolations.map((item) => item.code)).toContain("dialogue_obligation_plan_unrealizable");
  });

  it("detects ungrounded prompt facts and cross-scenario identity leakage", () => {
    const snapshot = auditKairaFinalProviderPrompt({
      scenarioId: "A1",
      branchTrackType: "regression",
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
    });

    const codes = snapshot.invariantViolations.map((item) => item.code);
    expect(codes).toContain("prompt_fact_without_provenance");
    expect(codes).toContain("session_isolation_failure");
  });
});
