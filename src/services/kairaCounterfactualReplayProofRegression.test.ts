import { describe, expect, it } from "vitest";
import { canonicalIdentityFromSeed } from "./kairaCanonicalIdentity";
import { buildKairaIdentityTestFixture, type KairaAutobiographicalMemory } from "./kairaIdentityContracts";
import {
  applyKairaSelfFactRevisionDecision,
  evaluateKairaSelfFactRevision,
} from "./kairaSelfFactRevision";
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

function revisionEvidence(
  id: string,
  value: string,
): KairaAutobiographicalMemory {
  return {
    id,
    origin: "lived",
    occurredAt: `2026-09-11T10:0${id.slice(-1)}:00.000Z`,
    participantIds: ["user_counterfactual"],
    eventType: "general",
    facts: ["counterfactual:self-revision-evidence"],
    emotions: [],
    salience: 0.8,
    sensitivity: "ordinary",
    canonical: true,
    sourceWorldObservationIds: [`obs_${id}`],
    consolidationKey: `world:${id}`,
    selfRevisionEvidence: {
      factKey: "preferred_music",
      domain: "preference",
      value,
      confidence: 0.9,
    },
  };
}

function runPendingQuestionChain(kairaMiddleTurn: string): DiscourseState {
  let state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
    actor: "user",
    message: "evdeyim",
    event: canonicalEvent("evdeyim", {
      intent: "general_chat",
      target: "current_user",
      socialRoutine: "none",
      discourseAct: "none",
    }),
  });
  state = reduceDiscourseState(state, {
    actor: "kaira",
    reply: kairaMiddleTurn,
  });
  return reduceDiscourseState(state, {
    actor: "user",
    message: "çay içiyorum",
    event: canonicalEvent("çay içiyorum", {
      intent: "general_chat",
      target: "current_user",
      socialRoutine: "none",
      discourseAct: "none",
      stateAnswerShape: true,
      activityAnswerShape: true,
      shortUtteranceShape: true,
    }),
  });
}

function runThreadResumptionChain(openThirdPartyThread: boolean): DiscourseState {
  let state = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
    actor: "user",
    message: openThirdPartyThread ? "Mert yine müdürle tartıştı" : "bugün iş yoğundu",
    event: canonicalEvent(
      openThirdPartyThread ? "Mert yine müdürle tartıştı" : "bugün iş yoğundu",
      openThirdPartyThread
        ? {
            intent: "complaint",
            target: "third_party",
            valence: "negative",
            socialRoutine: "none",
            discourseAct: "none",
            frustration: 0.4,
            emotionalLoad: 0.4,
          }
        : {
            intent: "general_chat",
            target: "current_user",
            socialRoutine: "none",
            discourseAct: "none",
          },
    ),
  });
  state = reduceDiscourseState(state, { actor: "kaira", reply: "anladım" });
  state = reduceDiscourseState(state, {
    actor: "user",
    message: "neyse kahve aldım",
    event: canonicalEvent("neyse kahve aldım", {
      intent: "general_chat",
      target: "current_user",
      socialRoutine: "none",
      discourseAct: "topic_shift",
    }),
  });
  state = reduceDiscourseState(state, { actor: "kaira", reply: "iyi olmuş" });
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

describe("Kaira multi-turn counterfactual replay proofs", () => {
  it("propagates one changed lived-evidence turn into a different canonical self-fact outcome", () => {
    const factual = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_counterfactual_self"));
    factual.autobiographicalMemories.push(
      revisionEvidence("m1", "ambient"),
      revisionEvidence("m2", "ambient"),
      revisionEvidence("m3", "ambient"),
    );

    const counterfactual = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_counterfactual_self"));
    counterfactual.autobiographicalMemories.push(
      revisionEvidence("m1", "ambient"),
      revisionEvidence("m2", "metal"),
      revisionEvidence("m3", "ambient"),
    );

    const factualDecision = evaluateKairaSelfFactRevision(factual, "preferred_music");
    const counterfactualDecision = evaluateKairaSelfFactRevision(counterfactual, "preferred_music");
    const factualNext = applyKairaSelfFactRevisionDecision(factual, factualDecision);
    const counterfactualNext = applyKairaSelfFactRevisionDecision(counterfactual, counterfactualDecision);

    expect(factualDecision.status).toBe("revised");
    expect(factualNext.selfFacts.find((fact) => fact.key === "preferred_music")?.value).toBe("ambient");
    expect(counterfactualDecision.status).toBe("insufficient_evidence");
    expect(counterfactualNext.selfFacts.find((fact) => fact.key === "preferred_music")).toBeUndefined();
  });

  it("propagates a changed prior Kaira turn into pending-question dependency for the same final user turn", () => {
    const factual = runPendingQuestionChain("ne yapıyorsun?");
    const counterfactual = runPendingQuestionChain("tamam");

    expect(factual.previousTurnDependency).toEqual({
      on: "kaira_question",
      responseKind: "answer",
    });
    expect(factual.pendingQuestion).toMatchObject({
      asker: "kaira",
      answered: true,
    });
    expect(counterfactual.previousTurnDependency).toBeNull();
    expect(counterfactual.pendingQuestion).toBeNull();
  });

  it("propagates an earlier third-party topic into later thread resumption without changing the final turn", () => {
    const factual = runThreadResumptionChain(true);
    const counterfactual = runThreadResumptionChain(false);

    expect(factual.openThreads).toHaveLength(1);
    expect(factual.openThreads[0]?.kind).toBe("third_party_topic");
    expect(factual.resumedThreadId).toBe(factual.openThreads[0]?.id);
    expect(factual.activeThreadId).toBe(factual.openThreads[0]?.id);
    expect(factual.ambiguousThreadResumption).toBe(false);

    expect(counterfactual.openThreads).toHaveLength(0);
    expect(counterfactual.resumedThreadId).toBeNull();
    expect(counterfactual.activeThreadId).toBeNull();
  });
});
