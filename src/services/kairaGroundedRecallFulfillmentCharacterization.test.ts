import { describe, expect, it } from "vitest";
import {
  findDialogueDecisionIssues,
  planDialogueResponse,
} from "./kairoDialogueDecisionEngine";

describe("grounded recall fulfillment characterization", () => {
  it("requires a grounded recall to carry a fulfillment contract", () => {
    const decision = planDialogueResponse(
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

    expect(decision.move).toBe("grounded_recall");
    expect(decision.obligation).toBeDefined();
  });

  it("rejects acknowledgement-only delivery for a grounded recall", () => {
    const decision = planDialogueResponse(
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

    for (const reply of ["tamam", "peki", "aynen", "anladım"]) {
      expect(findDialogueDecisionIssues(reply, decision)).toContain(
        "DialogueDecision obligation karşılanmadı: grounded_recall yalnız acknowledgement ile kapatılamaz",
      );
    }
  });

  it("keeps acknowledgement-only legal for a pure social routine", () => {
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
