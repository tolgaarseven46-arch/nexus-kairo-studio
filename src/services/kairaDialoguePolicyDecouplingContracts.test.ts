import { describe, expect, it } from "vitest";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";
import { reduceDiscourseState } from "./discourseStateReducer";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import { interpretSemanticEvent } from "./semanticEventEngine";

describe("C2 dialogue policy decoupling", () => {
  it("does not turn complaint/confusion content into repair without typed repair evidence", () => {
    const base = interpretSemanticEvent("ne alaka");
    const event = {
      ...base,
      intent: "complaint" as const,
      discourseAct: "confusion_or_challenge" as const,
      repairSignal: "none" as const,
    };
    const history = [{ sender: "droit", text: "önceki Kaira mesajı" }] as any[];

    expect(planDialogueResponse(history, "ne alaka", "Mert", event).move).not.toBe(
      "repair_or_rephrase",
    );
  });

  it("does not create previous-turn clarification dependency from complaint content alone", () => {
    const afterKaira = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "kaira",
      reply: "he anladım",
    });
    const base = interpretSemanticEvent("ne alaka");
    const state = reduceDiscourseState(afterKaira, {
      actor: "user",
      message: "ne alaka",
      event: {
        ...base,
        intent: "complaint",
        discourseAct: "confusion_or_challenge",
        repairSignal: "none",
      },
    });

    expect(state.previousTurnDependency).toBeNull();
  });

  it.each(["clarification_request", "relevance_challenge"] as const)(
    "still permits repair for explicit typed repair evidence: %s",
    (repairSignal) => {
      const base = interpretSemanticEvent("ne alaka");
      const event = { ...base, repairSignal };
      const history = [{ sender: "droit", text: "önceki Kaira mesajı" }] as any[];

      expect(planDialogueResponse(history, "ne alaka", "Mert", event)).toMatchObject({
        move: "repair_or_rephrase",
        repairSignal,
      });
    },
  );
});
