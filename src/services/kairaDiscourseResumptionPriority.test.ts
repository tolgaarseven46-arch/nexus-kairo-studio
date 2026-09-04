import { describe, expect, it } from "vitest";
import type { SemanticEvent } from "./semanticEventEngine";
import { reduceDiscourseState } from "./discourseStateReducer";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";

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

describe("typed discourse resumption priority", () => {
  it("does not manufacture a resumption target when there is no open thread", () => {
    const state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "user",
      message: "ne yapcam şimdi?",
      event: event({ adviceRequested: true, target: "unknown" }),
    });
    expect(state.resumedThreadId).toBeNull();
    expect(state.ambiguousThreadResumption).toBe(false);
  });
});
