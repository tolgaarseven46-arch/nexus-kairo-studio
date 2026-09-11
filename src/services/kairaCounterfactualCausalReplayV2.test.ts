import { describe, expect, it } from "vitest";
import { reduceDiscourseState } from "./discourseStateReducer";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import { projectSemanticEvent } from "./semanticInterpretationProjection";
import { EMPTY_DISCOURSE_STATE, type DiscourseState } from "../types/discourseState";

function canonicalEvent(raw: string, overrides: Record<string, unknown> = {}) {
  return {
    ...projectSemanticEvent(interpretationFromRegexFloor(raw)),
    ...overrides,
  } as any;
}

function runShortFollowUpChain(withPriorKairaStatement: boolean): DiscourseState {
  let state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
    actor: "user",
    message: "bugün iş çok karışıktı",
    event: canonicalEvent("bugün iş çok karışıktı", {
      intent: "general_chat",
      target: "current_user",
      socialRoutine: "none",
      discourseAct: "none",
    }),
  });

  if (withPriorKairaStatement) {
    state = reduceDiscourseState(state, {
      actor: "kaira",
      reply: "belli ki bayağı yormuş seni",
    });
  }

  return reduceDiscourseState(state, {
    actor: "user",
    message: "neden?",
    event: canonicalEvent("neden?", {
      intent: "information_request",
      target: "unknown",
      socialRoutine: "none",
      discourseAct: "none",
      shortUtteranceShape: true,
      adviceRequested: false,
      knowledgeQuery: null,
    }),
  });
}

function runCorrectionDependencyChain(withPriorKairaStatement: boolean): DiscourseState {
  let state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
    actor: "user",
    message: "Mert yarın gelecek",
    event: canonicalEvent("Mert yarın gelecek", {
      intent: "general_chat",
      target: "third_party",
      socialRoutine: "none",
      discourseAct: "none",
    }),
  });

  if (withPriorKairaStatement) {
    state = reduceDiscourseState(state, {
      actor: "kaira",
      reply: "Mert yarın geliyor yani",
    });
  }

  return reduceDiscourseState(state, {
    actor: "user",
    message: "yok Selami gelecek",
    event: canonicalEvent("yok Selami gelecek", {
      intent: "general_chat",
      target: "third_party",
      socialRoutine: "none",
      discourseAct: "correction",
      shortUtteranceShape: false,
    }),
  });
}

function runAmbiguousThirdPartyResumption(twoThreads: boolean): DiscourseState {
  let state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
    actor: "user",
    message: "Mert yine müdürle tartıştı",
    event: canonicalEvent("Mert yine müdürle tartıştı", {
      intent: "complaint",
      target: "third_party",
      valence: "negative",
      socialRoutine: "none",
      discourseAct: "none",
      frustration: 0.4,
      emotionalLoad: 0.4,
    }),
  });

  state = reduceDiscourseState(state, { actor: "kaira", reply: "anladım" });

  if (twoThreads) {
    state = reduceDiscourseState(state, {
      actor: "user",
      message: "Ayşe de patronuyla tartışmış",
      event: canonicalEvent("Ayşe de patronuyla tartışmış", {
        intent: "complaint",
        target: "third_party",
        valence: "negative",
        socialRoutine: "none",
        discourseAct: "topic_shift",
        frustration: 0.35,
        emotionalLoad: 0.35,
      }),
    });
    state = reduceDiscourseState(state, { actor: "kaira", reply: "o da kötü olmuş" });
  }

  return reduceDiscourseState(state, {
    actor: "user",
    message: "peki sence ne yapmalı",
    event: canonicalEvent("peki sence ne yapmalı", {
      intent: "information_request",
      target: "third_party",
      socialRoutine: "none",
      discourseAct: "none",
      adviceRequested: true,
    }),
  });
}

describe("Kaira counterfactual causal replay v2", () => {
  it("proves a short follow-up question depends on the immediately prior Kaira statement", () => {
    const factual = runShortFollowUpChain(true);
    const counterfactual = runShortFollowUpChain(false);

    expect(factual.previousTurnDependency).toEqual({
      on: "kaira_statement",
      responseKind: "follow_up_question",
    });
    expect(counterfactual.previousTurnDependency).toBeNull();
  });

  it("proves correction attribution depends on whether Kaira produced the corrected statement", () => {
    const factual = runCorrectionDependencyChain(true);
    const counterfactual = runCorrectionDependencyChain(false);

    expect(factual.previousTurnDependency).toEqual({
      on: "kaira_statement",
      responseKind: "correction",
    });
    expect(counterfactual.previousTurnDependency).toBeNull();
  });

  it("distinguishes one resumable third-party thread from ambiguous multi-thread history for the same final advice turn", () => {
    const factual = runAmbiguousThirdPartyResumption(false);
    const counterfactual = runAmbiguousThirdPartyResumption(true);

    expect(factual.openThreads).toHaveLength(1);
    expect(factual.resumedThreadId).toBe(factual.openThreads[0]?.id);
    expect(factual.ambiguousThreadResumption).toBe(false);

    expect(counterfactual.openThreads).toHaveLength(2);
    expect(counterfactual.resumedThreadId).toBeNull();
    expect(counterfactual.activeThreadId).toBeNull();
    expect(counterfactual.ambiguousThreadResumption).toBe(true);
  });
});
