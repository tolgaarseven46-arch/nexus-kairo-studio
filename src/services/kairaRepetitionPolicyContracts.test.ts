import { describe, expect, it } from "vitest";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";
import {
  buildDialogueDecisionInstruction,
  buildGroundedDialogueFallback,
  findDialogueDecisionIssues,
  planDialogueResponse,
} from "./kairoDialogueDecisionEngine";
import { interpretSemanticEvent } from "./semanticEventEngine";

describe("repetition policy boundary", () => {
  it("adds a typed repeat guard without changing the canonical dialogue move", () => {
    const event = interpretSemanticEvent("selam");
    const discourse = {
      ...EMPTY_DISCOURSE_STATE,
      selfRepeat: { act: "greeting" as const, count: 2 },
    };

    const withoutRepeat = planDialogueResponse([], "selam", "Mert", event);
    const guarded = planDialogueResponse([], "selam", "Mert", event, undefined, discourse);

    expect(guarded.move).toBe(withoutRepeat.move);
    expect(guarded.repeatGuard).toEqual({ act: "greeting", count: 2 });
    expect(buildDialogueDecisionInstruction(guarded)).toContain(
      '"greeting" sosyal işini yeniden üretme',
    );
  });

  it("deterministically rejects the repeated social act", () => {
    const event = interpretSemanticEvent("selam");
    const discourse = {
      ...EMPTY_DISCOURSE_STATE,
      selfRepeat: { act: "greeting" as const, count: 2 },
    };
    const plan = planDialogueResponse([], "selam", "Mert", event, undefined, discourse);

    expect(findDialogueDecisionIssues("selam", plan)).toContain(
      'Kaira son turlarda tekrarladığı "greeting" sosyal işini yeniden üretti',
    );
    expect(findDialogueDecisionIssues("burdayım", plan)).not.toContain(
      'Kaira son turlarda tekrarladığı "greeting" sosyal işini yeniden üretti',
    );
    expect(buildGroundedDialogueFallback(plan, [], "selam", "Mert")).toBe("burdayım");
  });

  it("uses a non-ack fallback when acknowledgement itself is repeating", () => {
    const event = interpretSemanticEvent("aynen");
    const discourse = {
      ...EMPTY_DISCOURSE_STATE,
      selfRepeat: { act: "agreement_ack" as const, count: 3 },
    };
    const plan = planDialogueResponse([], "aynen", "Mert", event, undefined, discourse);

    expect(plan.repeatGuard).toEqual({ act: "agreement_ack", count: 3 });
    expect(buildGroundedDialogueFallback(plan, [], "aynen", "Mert")).toBe("devam edelim");
    expect(findDialogueDecisionIssues("aynen", plan)).not.toHaveLength(0);
    expect(findDialogueDecisionIssues("devam edelim", plan)).toHaveLength(0);
  });

  it("does not let repetition context hijack factual or repair moves", () => {
    const discourse = {
      ...EMPTY_DISCOURSE_STATE,
      selfRepeat: { act: "agreement_ack" as const, count: 2 },
    };

    const question = interpretSemanticEvent("istanbul nerede");
    const questionPlan = planDialogueResponse([], "istanbul nerede", "Mert", question, undefined, discourse);
    expect(questionPlan.move).toBe("answer_or_clarify");
    expect(questionPlan.repeatGuard?.act).toBe("agreement_ack");

    const repair = {
      ...interpretSemanticEvent("ne alaka"),
      repairSignal: "relevance_challenge" as const,
    };
    const history = [{ sender: "droit", text: "önceki mesaj" }] as any[];
    const repairPlan = planDialogueResponse(history, "ne alaka", "Mert", repair, undefined, discourse);
    expect(repairPlan.move).toBe("repair_or_rephrase");
    expect(repairPlan.repeatGuard?.act).toBe("agreement_ack");
  });

  it("exempts farewell because completing an explicit goodbye remains obligatory", () => {
    const event = interpretSemanticEvent("görüşürüz");
    const discourse = {
      ...EMPTY_DISCOURSE_STATE,
      selfRepeat: { act: "farewell" as const, count: 2 },
    };
    const plan = planDialogueResponse([], "görüşürüz", "Mert", event, undefined, discourse);

    expect(plan.repeatGuard).toBeUndefined();
  });
});