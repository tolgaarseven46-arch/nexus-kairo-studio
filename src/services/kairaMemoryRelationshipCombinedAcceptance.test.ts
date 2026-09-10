import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import type { SocialAppraisalMemoryContext } from "../types/socialAppraisal";
import {
  analyzeKdmInteractionCanonicalTurn,
} from "./kdmConsistencyEngine";
import { normalizeDroitPersonality } from "./droitPersonalityNormalizer";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import type { SemanticEvent } from "./semanticEventEngine";
import { resolveRuntimeSocialAppraisal } from "./socialAppraisalRuntimeProjection";

const message = "sen aptalsın";

const semanticInterpretation = normalizeSemanticInterpretation({
  primaryIntent: "insult",
  secondarySocialActs: ["insult"],
  target: "kaira",
  valence: "negative",
  severity: {
    disrespect: 0.55,
    coercion: 0,
    manipulation: 0,
    privacy: 0,
    aggression: 0.2,
  },
  jokingConfidence: 0,
  sincerityConfidence: 0.9,
  affection: 0,
  support: 0,
  compliment: 0,
  emotionalLoad: 0.3,
  apology: false,
  repairAttempt: false,
  uncertainty: {
    overall: 0.1,
    intent: 0.05,
    target: 0.05,
    severity: 0.1,
  },
  evidence: [],
});

const semanticEvent: SemanticEvent & { relationshipScope: "kaira_user" } = {
  raw: message,
  normalized: message,
  intent: "insult",
  valence: "negative",
  target: "kaira",
  relationalAct: "none",
  relationalIntensity: 0,
  severity: 0.55,
  insult: true,
  redLine: false,
  disrespect: 0.55,
  coercion: 0,
  manipulation: 0,
  privacyViolation: 0,
  apology: false,
  repairAttempt: false,
  stopQuestions: false,
  stopTalking: false,
  frustration: 0,
  emotionalLoad: 0.3,
  affection: 0,
  support: 0,
  compliment: 0,
  relationshipScope: "kaira_user",
};

const memory: SocialAppraisalMemoryContext = {
  autobiographical: {
    participantId: "user:combined-acceptance",
    episodeCount: 16,
    salientEpisodeCount: 8,
    meanSalience: 0.9,
    maxSalience: 1,
    meanEmotionalIntensity: 0.9,
  },
};

function relationshipSeed(): DroitDynamicState {
  return {
    calmness: 70,
    anger: 10,
    stress: 20,
    happiness: 70,
    confidence: 70,
    surprise: 10,
    reactionMode: "neutral",
    lastStatus: "Sakin ve kontrollü",
    relationship: {
      firstSeenAt: "2026-08-10T12:00:00.000Z",
      lastInteractionAt: "2026-09-10T12:00:00.000Z",
      interactionCount: 120,
      familiarityDays: 31,
      warmth: 82,
      trust: 86,
      conflictScore: 0,
      hurtScore: 0,
      repairProgress: 0,
      positiveEvents: 95,
      negativeEvents: 4,
      repeatedNegativeCount: 0,
      conversationState: "active",
    },
  };
}

function injuryDelta(before: DroitDynamicState, after: DroitDynamicState): number {
  return (
    Number(after.relationship?.conflictScore ?? 0) - Number(before.relationship?.conflictScore ?? 0) +
    Number(after.relationship?.hurtScore ?? 0) - Number(before.relationship?.hurtScore ?? 0)
  );
}

function negativeAffectPressure(before: DroitDynamicState, after: DroitDynamicState): number {
  return (
    Number(after.anger ?? 0) - Number(before.anger ?? 0) +
    Number(after.stress ?? 0) - Number(before.stress ?? 0) +
    Number(before.happiness ?? 0) - Number(after.happiness ?? 0) +
    Number(before.calmness ?? 0) - Number(after.calmness ?? 0)
  );
}

describe("Kaira memory + relationship combined behavior acceptance", () => {
  it("lets bounded autobiography deepen affect without becoming a second relationship authority", () => {
    const state = relationshipSeed();
    const personality = normalizeDroitPersonality({});

    const withoutMemoryAppraisal = resolveRuntimeSocialAppraisal({
      semantic: semanticInterpretation,
      relationshipScope: "kaira_user",
      relationship: state.relationship ?? {},
      currentState: state,
      personality,
    });
    const withMemoryAppraisal = resolveRuntimeSocialAppraisal({
      semantic: semanticInterpretation,
      relationshipScope: "kaira_user",
      relationship: state.relationship ?? {},
      memory,
      currentState: state,
      personality,
    });

    expect(withMemoryAppraisal.runtimeAppraisal.relational).toEqual(
      withoutMemoryAppraisal.runtimeAppraisal.relational,
    );
    expect(withMemoryAppraisal.runtimeAppraisal.affective.significance).toBeGreaterThan(
      withoutMemoryAppraisal.runtimeAppraisal.affective.significance,
    );
    expect(withMemoryAppraisal.runtimeAppraisal.affective.activation).toBeGreaterThan(
      withoutMemoryAppraisal.runtimeAppraisal.affective.activation,
    );

    const withoutMemory = analyzeKdmInteractionCanonicalTurn(
      message,
      {},
      relationshipSeed(),
      semanticInterpretation,
      semanticEvent,
    );
    const withMemory = analyzeKdmInteractionCanonicalTurn(
      message,
      {},
      relationshipSeed(),
      semanticInterpretation,
      semanticEvent,
      null,
      null,
      memory,
    );

    const withoutMemoryInjury = injuryDelta(relationshipSeed(), withoutMemory.nextDynamicState);
    const withMemoryInjury = injuryDelta(relationshipSeed(), withMemory.nextDynamicState);

    expect(withoutMemoryInjury).toBeGreaterThan(0);
    expect(withMemoryInjury).toBe(withoutMemoryInjury);
    expect(withMemory.nextDynamicState.relationship?.warmth).toBe(
      withoutMemory.nextDynamicState.relationship?.warmth,
    );
    expect(withMemory.nextDynamicState.relationship?.trust).toBe(
      withoutMemory.nextDynamicState.relationship?.trust,
    );
    expect(withMemory.nextDynamicState.relationship?.conversationState).toBe(
      withoutMemory.nextDynamicState.relationship?.conversationState,
    );

    expect(negativeAffectPressure(relationshipSeed(), withMemory.nextDynamicState)).toBeGreaterThan(
      negativeAffectPressure(relationshipSeed(), withoutMemory.nextDynamicState),
    );

    expect(withMemory.trace.messageInterpretation.intent).toBe(
      withoutMemory.trace.messageInterpretation.intent,
    );
    expect(withMemory.trace.messageInterpretation.sentiment).toBe(
      withoutMemory.trace.messageInterpretation.sentiment,
    );
  });
});
