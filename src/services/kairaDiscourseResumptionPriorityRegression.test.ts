import { describe, expect, it } from "vitest";
import type { SemanticEvent } from "./semanticEventEngine";
import { reduceDiscourseState } from "./discourseStateReducer";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";

const baseEvent = (overrides: Partial<SemanticEvent> = {}): SemanticEvent => ({
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

describe("S7 compound thread-resumption priority regression", () => {
  it("resumes the only existing thread when advice request is also third-party targeted", () => {
    let state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "user",
      message: "Emreyle dün çok kötü tartıştık, sonra anlatırım",
      event: baseEvent({
        raw: "Emreyle dün çok kötü tartıştık, sonra anlatırım",
        intent: "emotional_share",
        target: "third_party",
        valence: "negative",
        emotionalLoad: 0.7,
      }),
    });
    const original = state.openThreads[0]?.id;
    expect(original).toBeTruthy();

    state = reduceDiscourseState(state, { actor: "kaira", reply: "niye ya" });
    state = reduceDiscourseState(state, {
      actor: "user",
      message: "neyse bugün kahve aldım",
      event: baseEvent({ discourseAct: "topic_shift" }),
    });
    state = reduceDiscourseState(state, { actor: "kaira", reply: "he tamam" });
    state = reduceDiscourseState(state, {
      actor: "user",
      message: "neyse ben o çocukla ne yapcam şimdi?",
      event: baseEvent({
        raw: "neyse ben o çocukla ne yapcam şimdi?",
        intent: "emotional_share",
        discourseAct: "topic_shift",
        target: "third_party",
        adviceRequested: true,
        emotionalLoad: 0.4,
      }),
    });

    expect(state.openThreads).toHaveLength(1);
    expect(state.resumedThreadId).toBe(original);
    expect(state.activeThreadId).toBe(original);
    expect(state.ambiguousThreadResumption).toBe(false);
  });

  it("still creates a new third-party thread when no typed resumption is requested", () => {
    const state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "user",
      message: "Ayşeyle tartıştık",
      event: baseEvent({
        raw: "Ayşeyle tartıştık",
        intent: "emotional_share",
        target: "third_party",
        valence: "negative",
        emotionalLoad: 0.6,
      }),
    });
    expect(state.openThreads).toHaveLength(1);
    expect(state.resumedThreadId).toBeNull();
  });
});
