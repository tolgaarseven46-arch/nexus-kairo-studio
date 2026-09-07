import { describe, expect, it } from "vitest";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";
import { reduceDiscourseState } from "./discourseStateReducer";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import type { SemanticEvent } from "./semanticEventEngine";

function canonicalQuestion(overrides: Partial<SemanticEvent> = {}): SemanticEvent {
  return {
    raw: "neden",
    normalized: "neden",
    intent: "question",
    socialRoutine: "none",
    discourseAct: "none",
    repairSignal: "none",
    adviceRequested: false,
    knowledgeQuery: null,
    worldMemory: { claims: [], query: null },
    valence: "neutral",
    target: "unknown",
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
    // This fixture represents the canonical ingestion result for the archived
    // one-word Turn 15 follow-up. Downstream discourse must consume the typed
    // shape facet rather than re-counting words from raw user text.
    shortUtteranceShape: true,
    activityAnswerShape: false,
    ...overrides,
  };
}

describe("short contextual follow-up question continuity", () => {
  it("binds the archived Turn 15 shape to Kaira's immediately previous statement and requires an answer", () => {
    const afterKaira = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "kaira",
      reply: "yok o kadar değil",
    });
    const event = canonicalQuestion();
    const discourse = reduceDiscourseState(afterKaira, {
      actor: "user",
      message: "neden",
      event,
    });

    expect(discourse.previousTurnDependency).toEqual({
      on: "kaira_statement",
      responseKind: "follow_up_question",
    });

    const plan = planDialogueResponse(
      [{ sender: "droit", text: "yok o kadar değil" }],
      "neden",
      "Tolga",
      event,
      undefined,
      discourse,
    );

    expect(plan.move).toBe("answer_or_clarify");
    expect(plan.allowFollowUpQuestion).toBe(false);
    expect(plan.obligation?.type).toBe("answer_or_clarify");
    expect(plan.reason).toContain("hemen önceki sözüne bağlı");
  });

  it("does not bind a short canonical question whose target is already explicitly Kaira", () => {
    const afterKaira = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "kaira",
      reply: "yok o kadar değil",
    });
    const event = canonicalQuestion({
      raw: "kaç yaşındasın",
      normalized: "kaç yaşındasın",
      target: "kaira",
    });
    const discourse = reduceDiscourseState(afterKaira, {
      actor: "user",
      message: "kaç yaşındasın",
      event,
    });

    expect(discourse.previousTurnDependency).toBeNull();
    const plan = planDialogueResponse(
      [{ sender: "droit", text: "yok o kadar değil" }],
      "kaç yaşındasın",
      "Tolga",
      event,
      undefined,
      discourse,
    );
    expect(plan.move).toBe("answer_or_clarify");
    expect(plan.allowFollowUpQuestion).toBe(true);
  });
});
