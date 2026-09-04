import { describe, expect, it } from "vitest";
import type { SemanticEvent } from "./semanticEventEngine";
import {
  buildDiscourseObservationalInstruction,
  reduceDiscourseState,
} from "./discourseStateReducer";
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

const thirdPartySeed = (raw: string, extra: Partial<SemanticEvent> = {}) =>
  event({
    raw,
    normalized: raw.toLocaleLowerCase("tr-TR"),
    intent: "emotional_share",
    target: "third_party",
    valence: "negative",
    emotionalLoad: 0.7,
    ...extra,
  });

describe("session-scoped open-thread continuity", () => {
  it("resumes one unresolved third-party topic after unrelated turns without reparsing history", () => {
    let state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "user",
      message: "Emreyle dün çok kötü tartıştık, sonra anlatırım",
      event: thirdPartySeed("Emreyle dün çok kötü tartıştık, sonra anlatırım"),
    });
    const threadId = state.activeThreadId;
    expect(threadId).toBeTruthy();

    state = reduceDiscourseState(state, { actor: "kaira", reply: "noldu" });
    state = reduceDiscourseState(state, {
      actor: "user",
      message: "neyse bugün hava baya sıcak",
      event: event({ raw: "neyse bugün hava baya sıcak", intent: "general_chat", discourseAct: "topic_shift" }),
    });
    expect(state.openThreads).toHaveLength(1);
    expect(state.activeThreadId).toBeNull();

    state = reduceDiscourseState(state, { actor: "kaira", reply: "evet sıcak" });
    state = reduceDiscourseState(state, {
      actor: "user",
      message: "neyse ben o çocukla ne yapcam şimdi?",
      event: event({
        raw: "neyse ben o çocukla ne yapcam şimdi?",
        intent: "question",
        adviceRequested: true,
        target: "unknown",
      }),
    });

    expect(state.resumedThreadId).toBe(threadId);
    expect(state.ambiguousThreadResumption).toBe(false);
    const instruction = buildDiscourseObservationalInstruction(state);
    expect(instruction).toContain("Emreyle dün çok kötü tartıştık");
    expect(instruction).toContain("yalnız bağlam/evidence");
  });

  it("keeps an unresolved thread suspended across ordinary unrelated smalltalk", () => {
    let state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "user",
      message: "Ahmetle işte tartıştık",
      event: thirdPartySeed("Ahmetle işte tartıştık"),
    });
    expect(state.openThreads).toHaveLength(1);

    state = reduceDiscourseState(state, { actor: "kaira", reply: "noldu" });
    state = reduceDiscourseState(state, {
      actor: "user",
      message: "bu arada kahve aldım",
      event: event({ raw: "bu arada kahve aldım", discourseAct: "topic_shift" }),
    });

    expect(state.openThreads).toHaveLength(1);
    expect(state.activeThreadId).toBeNull();
    expect(state.resumedThreadId).toBeNull();
  });

  it("does not guess when a vague resumption is compatible with multiple unresolved threads", () => {
    let state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "user",
      message: "Emreyle tartıştık",
      event: thirdPartySeed("Emreyle tartıştık"),
    });
    state = reduceDiscourseState(state, { actor: "kaira", reply: "noldu" });
    state = reduceDiscourseState(state, {
      actor: "user",
      message: "bu arada başka konu",
      event: event({ raw: "bu arada başka konu", discourseAct: "topic_shift" }),
    });
    state = reduceDiscourseState(state, { actor: "kaira", reply: "tamam" });
    state = reduceDiscourseState(state, {
      actor: "user",
      message: "Ayşeyle de dün kavga ettik",
      event: thirdPartySeed("Ayşeyle de dün kavga ettik", { discourseAct: "topic_shift" }),
    });
    expect(state.openThreads).toHaveLength(2);

    state = reduceDiscourseState(state, { actor: "kaira", reply: "hmm" });
    state = reduceDiscourseState(state, {
      actor: "user",
      message: "peki o kişiyle ne yapayım?",
      event: event({ raw: "peki o kişiyle ne yapayım?", intent: "question", adviceRequested: true }),
    });

    expect(state.resumedThreadId).toBeNull();
    expect(state.activeThreadId).toBeNull();
    expect(state.ambiguousThreadResumption).toBe(true);
    expect(buildDiscourseObservationalInstruction(state)).toContain("birden fazla açık üçüncü-kişi konusu");
  });

  it("does not open a third-party thread from a dyadic Kaira-user turn", () => {
    const state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "user",
      message: "kaira sana kızdım",
      event: event({
        raw: "kaira sana kızdım",
        intent: "complaint",
        target: "kaira",
        valence: "negative",
        frustration: 0.8,
      }),
    });
    expect(state.openThreads).toEqual([]);
  });
});
