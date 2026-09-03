import { describe, expect, it } from "vitest";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";
import { reduceDiscourseState } from "./discourseStateReducer";
import {
  buildGroundedDialogueFallback,
  findDialogueDecisionIssues,
  planDialogueResponse,
} from "./kairoDialogueDecisionEngine";
import { interpretSemanticEvent } from "./semanticEventEngine";

describe("repetition policy regression", () => {
  it("carries observed self-repeat into delivery policy without reparsing the user turn", () => {
    let discourse = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "kaira",
      reply: "selam",
    });
    discourse = reduceDiscourseState(discourse, {
      actor: "user",
      message: "naber",
      event: interpretSemanticEvent("naber"),
    });
    discourse = reduceDiscourseState(discourse, {
      actor: "kaira",
      reply: "selam yine",
    });

    expect(discourse.selfRepeat).toEqual({ act: "greeting", count: 2 });

    const event = interpretSemanticEvent("selam");
    discourse = reduceDiscourseState(discourse, {
      actor: "user",
      message: "selam",
      event,
    });
    const plan = planDialogueResponse([], "selam", "Mert", event, undefined, discourse);

    expect(plan.repeatGuard).toEqual({ act: "greeting", count: 2 });
    expect(findDialogueDecisionIssues("selam", plan)).not.toHaveLength(0);

    const fallback = buildGroundedDialogueFallback(plan, [], "selam", "Mert");
    expect(fallback).toBe("burdayım");
    expect(findDialogueDecisionIssues(fallback!, plan)).toHaveLength(0);
  });

  it("keeps an information request authoritative while preventing an unrelated repeated ack", () => {
    const discourse = {
      ...EMPTY_DISCOURSE_STATE,
      selfRepeat: { act: "agreement_ack" as const, count: 2 },
    };
    const event = interpretSemanticEvent("istanbul nerede");
    const plan = planDialogueResponse([], "istanbul nerede", "Mert", event, undefined, discourse);

    expect(plan.move).toBe("answer_or_clarify");
    expect(plan.repeatGuard?.act).toBe("agreement_ack");
    expect(findDialogueDecisionIssues("he anladım", plan)).not.toHaveLength(0);
    expect(findDialogueDecisionIssues("Türkiye'de", plan)).toHaveLength(0);
  });
});
