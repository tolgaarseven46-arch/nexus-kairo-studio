import { describe, expect, it } from "vitest";
import type { SemanticEvent } from "./semanticEventEngine";
import { reduceDiscourseState } from "./discourseStateReducer";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";

const event = (overrides: Partial<SemanticEvent> = {}): SemanticEvent => ({
  raw: "",
  normalized: "",
  intent: "general_chat",
  socialRoutine: "none",
  discourseAct: "none",
  repairSignal: "none",
  adviceRequested: false,
  knowledgeQuery: null,
  valence: "neutral",
  target: "unknown",
  relationalAct: "none",
  relationalIntensity: 0,
  severity: 0,
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
  emotionalLoad: 0,
  affection: 0,
  support: 0,
  compliment: 0,
  ...overrides,
});

describe("S7 open-thread advice priority regression", () => {
  it("keeps the resumed thread context while DialogueDecision preserves the explicit advice obligation", () => {
    let discourse = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "user",
      message: "Emreyle dün çok kötü tartıştık, sonra anlatırım",
      event: event({
        raw: "Emreyle dün çok kötü tartıştık, sonra anlatırım",
        intent: "emotional_share",
        target: "third_party",
        valence: "negative",
        emotionalLoad: 0.5,
        frustration: 0.27,
      }),
    });
    discourse = reduceDiscourseState(discourse, { actor: "kaira", reply: "niye ya" });
    discourse = reduceDiscourseState(discourse, {
      actor: "user",
      message: "neyse bugün kahve aldım",
      event: event({ raw: "neyse bugün kahve aldım", discourseAct: "topic_shift" }),
    });
    discourse = reduceDiscourseState(discourse, { actor: "kaira", reply: "iyiymiş" });

    const finalEvent = event({
      raw: "neyse ben o çocukla ne yapcam şimdi?",
      normalized: "neyse ben o çocukla ne yapacağım şimdi?",
      intent: "emotional_share",
      discourseAct: "topic_shift",
      adviceRequested: true,
      target: "event",
      valence: "negative",
      emotionalLoad: 0.5,
    });
    discourse = reduceDiscourseState(discourse, {
      actor: "user",
      message: finalEvent.raw,
      event: finalEvent,
    });

    expect(discourse.resumedThreadId).toBeTruthy();
    expect(discourse.ambiguousThreadResumption).toBe(false);

    const plan = planDialogueResponse([], finalEvent.raw, "Mert", finalEvent, undefined, discourse);
    expect(plan.move).toBe("answer_or_clarify");
    expect(plan.obligation?.type).toBe("answer_or_clarify");
    expect(plan.obligation?.satisfactionCriteria.forbiddenResponseClasses)
      .toContain("acknowledgement_only");
  });
});
