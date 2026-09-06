import { describe, expect, it } from "vitest";
import {
  buildDialogueDecisionInstruction,
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

describe("relational bid fulfillment authority regression", () => {
  it("carries the no-acknowledgement rule in the decision-owned obligation", () => {
    const decision = relationalDecision();
    expect(decision.move).toBe("respond_to_relational_bid");
    expect(decision.obligation?.type).toBe("respond_to_relational_bid");
    expect(decision.obligation?.satisfactionCriteria.forbiddenResponseClasses).toContain(
      "acknowledgement_only",
    );
    expect(buildDialogueDecisionInstruction(decision)).toContain(
      "Obligation: respond_to_relational_bid; yalnız acknowledgement ile kapanamaz",
    );
  });

  it("rejects generic acknowledgement through the generic obligation validator", () => {
    const decision = relationalDecision();
    for (const reply of ["tamam", "peki", "aynen", "anladım"]) {
      expect(findDialogueDecisionIssues(reply, decision)).toContain(
        "DialogueDecision obligation karşılanmadı: respond_to_relational_bid yalnız acknowledgement ile kapatılamaz",
      );
    }
    expect(findDialogueDecisionIssues("ben de seviyorum", decision)).not.toContain(
      "DialogueDecision obligation karşılanmadı: respond_to_relational_bid yalnız acknowledgement ile kapatılamaz",
    );
  });

  it("keeps pure social routines outside the fulfillment contract", () => {
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
