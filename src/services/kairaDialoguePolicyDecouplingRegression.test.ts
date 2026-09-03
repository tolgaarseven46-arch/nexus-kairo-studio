import { describe, expect, it } from "vitest";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";
import { reduceDiscourseState } from "./discourseStateReducer";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import { interpretSemanticEvent } from "./semanticEventEngine";

describe("C2 dialogue policy decoupling regression", () => {
  it("keeps content-only complaint separate from an actual repair sequence", () => {
    const afterKaira = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "kaira",
      reply: "bence bugün biraz dinlen",
    });

    const complaintBase = interpretSemanticEvent("ne alaka");
    const contentOnlyComplaint = {
      ...complaintBase,
      intent: "complaint" as const,
      discourseAct: "confusion_or_challenge" as const,
      repairSignal: "none" as const,
    };

    const complaintState = reduceDiscourseState(afterKaira, {
      actor: "user",
      message: "ne alaka",
      event: contentOnlyComplaint,
    });
    const history = [{ sender: "droit", text: "bence bugün biraz dinlen" }] as any[];
    const complaintPlan = planDialogueResponse(
      history,
      "ne alaka",
      "Mert",
      contentOnlyComplaint,
      undefined,
      complaintState,
    );

    expect(complaintState.previousTurnDependency).toBeNull();
    expect(complaintPlan.move).not.toBe("repair_or_rephrase");

    const explicitRepair = {
      ...complaintBase,
      repairSignal: "relevance_challenge" as const,
    };
    const repairState = reduceDiscourseState(afterKaira, {
      actor: "user",
      message: "ne alaka",
      event: explicitRepair,
    });
    const repairPlan = planDialogueResponse(
      history,
      "ne alaka",
      "Mert",
      explicitRepair,
      undefined,
      repairState,
    );

    expect(repairState.previousTurnDependency).toEqual({
      on: "kaira_statement",
      responseKind: "clarification",
    });
    expect(repairPlan).toMatchObject({
      move: "repair_or_rephrase",
      repairSignal: "relevance_challenge",
    });
  });
});
