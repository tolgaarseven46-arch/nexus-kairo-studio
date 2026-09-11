import { describe, expect, it } from "vitest";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";

// Red/green authority probe: multiple unresolved threads must force clarification.
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

describe("ambiguous open-thread resumption decision", () => {
  it("requires clarification before answering when multiple unresolved threads could own an advice request", () => {
    const discourse = {
      ...EMPTY_DISCOURSE_STATE,
      openThreads: [
        {
          id: "third-party-thread-1",
          kind: "third_party_topic",
          anchorText: "Mert işi bırakacak",
          openedAtTurn: 1,
          lastRelevantTurn: 1,
        },
        {
          id: "third-party-thread-3",
          kind: "third_party_topic",
          anchorText: "Ali zam istiyor",
          openedAtTurn: 3,
          lastRelevantTurn: 3,
        },
      ],
      activeThreadId: null,
      resumedThreadId: null,
      ambiguousThreadResumption: true,
    } as any;

    const plan = planDialogueResponse(
      [],
      "ne yapayım sence",
      "Tolga",
      event(),
      undefined,
      discourse,
    );

    expect(plan.move).toBe("answer_or_clarify");
    expect(plan.allowFollowUpQuestion).toBe(true);
    expect(plan.maxSentences).toBe(1);
    expect(plan.reason).toContain("birden fazla açık");
    expect(plan.reason).toContain("önce hangisini");
  });

  it("does not steal unambiguous advice handling", () => {
    const plan = planDialogueResponse(
      [],
      "ne yapayım sence",
      "Tolga",
      event(),
      undefined,
      { ...EMPTY_DISCOURSE_STATE, ambiguousThreadResumption: false } as any,
    );

    expect(plan.move).toBe("answer_or_clarify");
    expect(plan.maxSentences).toBe(3);
    expect(plan.reason).toContain("açıkça görüş/tavsiye istiyor");
  });
});
