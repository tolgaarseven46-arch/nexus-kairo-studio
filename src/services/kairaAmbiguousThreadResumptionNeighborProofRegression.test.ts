import { describe, expect, it } from "vitest";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";

function event(overrides: Record<string, unknown> = {}) {
  return {
    raw: "ne yapayım sence",
    normalized: "ne yapayım sence",
    intent: "question",
    socialRoutine: "none",
    discourseAct: "none",
    repairSignal: "none",
    adviceRequested: true,
    knowledgeQuery: null,
    worldMemory: { claims: [], query: null },
    valence: "neutral",
    target: "third_party",
    relationalAct: "none",
    relationalIntensity: 0.1,
    severity: 0.045,
    insult: false,
    redLine: false,
    disrespect: 0,
    coercion: 0,
    manipulation: 0,
    privacyViolation: 0,
    apology: false,
    repairAttempt: false,
    stopQuestions: false,
    stopTalking: false,
    frustration: 0,
    emotionalLoad: 0.1,
    affection: 0,
    support: 0,
    compliment: 0,
    ...overrides,
  } as any;
}

function discourse(ambiguousThreadResumption: boolean) {
  return {
    ...EMPTY_DISCOURSE_STATE,
    openThreads: ambiguousThreadResumption
      ? [
          {
            id: "thread-mert",
            kind: "third_party_topic",
            anchorText: "Mert işi bırakacak",
            openedAtTurn: 1,
            lastRelevantTurn: 1,
          },
          {
            id: "thread-ali",
            kind: "third_party_topic",
            anchorText: "Ali zam istiyor",
            openedAtTurn: 3,
            lastRelevantTurn: 3,
          },
        ]
      : [],
    activeThreadId: null,
    resumedThreadId: null,
    ambiguousThreadResumption,
  } as any;
}

function plan(raw: string, overrides: Record<string, unknown> = {}) {
  return planDialogueResponse(
    [],
    raw,
    "Tolga",
    event({ raw, normalized: raw, ...overrides }),
    undefined,
    discourse(true),
  );
}

describe("ambiguous open-thread resumption bug-class neighbor proof", () => {
  it("reported: ambiguous short advice request requires clarification before content", () => {
    const result = plan("ne yapayım sence");
    expect(result.move).toBe("answer_or_clarify");
    expect(result.allowFollowUpQuestion).toBe(true);
    expect(result.maxSentences).toBe(1);
    expect(result.reason.toLocaleLowerCase("tr-TR")).toContain("birden fazla açık");
  });

  it("neighbor-1: ambiguous short recommendation request requires clarification before content", () => {
    const result = plan("sence hangisini yapayım");
    expect(result.move).toBe("answer_or_clarify");
    expect(result.allowFollowUpQuestion).toBe(true);
    expect(result.maxSentences).toBe(1);
    expect(result.reason).toContain("hangisini kastettiğini");
  });

  it("neighbor-2: ambiguous short opinion request requires clarification before content", () => {
    const result = plan("sen olsan ne yapardın");
    expect(result.move).toBe("answer_or_clarify");
    expect(result.allowFollowUpQuestion).toBe(true);
    expect(result.maxSentences).toBe(1);
    expect(result.allowSpeculation).toBe(false);
  });

  it("counterexample: unambiguous advice request preserves normal advice handling", () => {
    const result = planDialogueResponse(
      [],
      "ne yapayım sence",
      "Tolga",
      event(),
      undefined,
      discourse(false),
    );
    expect(result.move).toBe("answer_or_clarify");
    expect(result.maxSentences).toBe(3);
    expect(result.reason).toContain("açıkça görüş/tavsiye istiyor");
  });
});
