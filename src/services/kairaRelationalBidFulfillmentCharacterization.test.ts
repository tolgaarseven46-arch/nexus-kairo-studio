import { describe, expect, it } from "vitest";
import {
  findDialogueDecisionIssues,
  planDialogueResponse,
} from "./kairoDialogueDecisionEngine";

const relationalDecision = () =>
  planDialogueResponse(
    [],
    "seni seviyorum",
    "Tolga",
    {
      intent: "affection",
      discourseAct: "none",
      socialRoutine: "none",
      repairSignal: "none",
      adviceRequested: false,
      target: "kaira",
      relationalAct: "closeness_bid",
      affection: 1,
    } as any,
  );

describe("relational bid fulfillment authority characterization", () => {
  it("requires a relational bid to carry a decision-owned fulfillment contract", () => {
    const decision = relationalDecision();

    expect(decision.move).toBe("respond_to_relational_bid");
    expect(decision.obligation?.type).toBe("respond_to_relational_bid");
  });

  it("keeps generic acknowledgement invalid for the relational obligation", () => {
    const decision = relationalDecision();

    for (const reply of ["tamam", "peki", "aynen", "anladım"]) {
      expect(findDialogueDecisionIssues(reply, decision)).toContain(
        "DialogueDecision obligation karşılanmadı: respond_to_relational_bid yalnız acknowledgement ile kapatılamaz",
      );
    }
  });

  it("keeps a pure social routine obligation-free", () => {
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
  });
});
