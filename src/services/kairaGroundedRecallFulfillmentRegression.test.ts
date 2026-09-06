import { describe, expect, it } from "vitest";
import {
  findDialogueDecisionIssues,
  planDialogueResponse,
} from "./kairoDialogueDecisionEngine";

const recallDecision = () =>
  planDialogueResponse(
    [],
    "Mert yarın ne yapacaktı?",
    "Tolga",
    {
      intent: "information_request",
      discourseAct: "recall_request",
      socialRoutine: "none",
      repairSignal: "none",
      adviceRequested: false,
      target: "third_party",
    } as any,
  );

describe("grounded recall fulfillment regression", () => {
  it("gives grounded recall a decision-owned fulfillment contract", () => {
    const decision = recallDecision();
    expect(decision.move).toBe("grounded_recall");
    expect(decision.obligation?.type).toBe("grounded_recall");
    expect(decision.obligation?.satisfactionCriteria.forbiddenResponseClasses).toContain(
      "acknowledgement_only",
    );
  });

  it("rejects acknowledgement-only recall delivery", () => {
    const decision = recallDecision();
    for (const reply of ["tamam", "peki", "aynen", "anladım"]) {
      expect(findDialogueDecisionIssues(reply, decision)).toContain(
        "DialogueDecision obligation karşılanmadı: grounded_recall yalnız acknowledgement ile kapatılamaz",
      );
    }
    expect(findDialogueDecisionIssues("Mert için doğrulanmış bir plan yok.", decision)).not.toContain(
      "DialogueDecision obligation karşılanmadı: grounded_recall yalnız acknowledgement ile kapatılamaz",
    );
  });

  it("does not give pure social routines a fulfillment obligation", () => {
    const decision = planDialogueResponse(
      [],
      "tamam",
      "Tolga",
      {
        intent: "general_chat",
        discourseAct: "none",
        socialRoutine: "agreement",
        repairSignal: "none",
        adviceRequested: false,
      } as any,
    );
    expect(decision.move).toBe("complete_social_routine");
    expect(decision.obligation).toBeUndefined();
    expect(findDialogueDecisionIssues("aynen", decision)).toEqual([]);
  });
});
