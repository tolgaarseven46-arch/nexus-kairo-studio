import { describe, expect, it } from "vitest";
import type { DroitDynamicState, DroitPersonalityTraits, RelationshipState } from "../types/nexus";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { emptyDyadicSocialNorm } from "./dyadicSocialNorm";
import { observeCanonicalDyadicNorm } from "./dyadicSocialNormObservation";
import { resolveRuntimeSocialAppraisal } from "./socialAppraisalRuntimeProjection";

const personality: DroitPersonalityTraits = {
  anger: 50, patience: 50, empathy: 50, emotionalSensitivity: 50,
  socialIntelligence: 50, selfConfidence: 50, humor: 50, communication: 50,
  charisma: 50, curiosity: 50, analyticalThinking: 50, creativity: 50,
  decisionMaking: 50, attention: 50, authority: 50, courage: 50,
  seriousness: 50, loyalty: 50, initiative: 50,
};
const state: DroitDynamicState = {
  calmness: 60, anger: 20, stress: 30, happiness: 55, confidence: 60,
  surprise: 0, lastStatus: "neutral", reactionMode: "neutral",
};
const relationship: RelationshipState = {
  warmth: 50, trust: 50, interactionCount: 10, familiarityDays: 5,
  conflictScore: 10, hurtScore: 10,
};

function insult(severity: number, joking: number, sincerity: number, uncertainty: number) {
  return normalizeSemanticInterpretation({
    primaryIntent: "insult",
    secondarySocialActs: ["insult"],
    target: "kaira",
    valence: "negative",
    severity: { disrespect: severity, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
    jokingConfidence: joking,
    sincerityConfidence: sincerity,
    affection: 0, support: 0, compliment: 0, emotionalLoad: 0.25,
    apology: false, repairAttempt: false,
    uncertainty: { overall: uncertainty, intent: uncertainty, target: 0.05, severity: uncertainty },
    evidence: [],
  });
}

function establishedProfile(kind: "benign" | "harmful") {
  let profile = emptyDyadicSocialNorm("active-interlocutor");
  const semantic = kind === "benign"
    ? insult(0.3, 0.75, 0.35, 0.5)
    : insult(0.85, 0.05, 0.95, 0.1);
  for (let i = 0; i < 3; i += 1) {
    profile = observeCanonicalDyadicNorm(profile, semantic, "kaira_user", `2026-09-08T12:0${i}:00.000Z`);
  }
  return profile;
}

describe("learned dyadic norm runtime wiring", () => {
  it("same canonical ambiguous insult produces different runtime harm pressure from prior dyad evidence", () => {
    const semantic = insult(0.35, 0.6, 0.45, 0.45);
    const benign = resolveRuntimeSocialAppraisal({
      semantic, relationshipScope: "kaira_user", relationship,
      dyadicNorm: establishedProfile("benign"), currentState: state, personality,
    });
    const harmful = resolveRuntimeSocialAppraisal({
      semantic, relationshipScope: "kaira_user", relationship,
      dyadicNorm: establishedProfile("harmful"), currentState: state, personality,
    });

    expect(benign.dyadicApplied).toBe(true);
    expect(harmful.dyadicApplied).toBe(true);
    expect(benign.runtimeAppraisal.relational.harmEvidence)
      .toBeLessThan(harmful.runtimeAppraisal.relational.harmEvidence);
  });

  it("does not apply a profile whose local subject ownership does not match", () => {
    const semantic = insult(0.35, 0.6, 0.45, 0.45);
    const mismatched = { ...establishedProfile("benign"), subjectId: "someone-else" };
    const result = resolveRuntimeSocialAppraisal({
      semantic, relationshipScope: "kaira_user", relationship,
      dyadicNorm: mismatched, currentState: state, personality,
    });
    expect(result.dyadicApplied).toBe(false);
  });

  it("learns only after appraisal, so the current turn cannot influence its own prior", () => {
    const semantic = insult(0.3, 0.75, 0.35, 0.5);
    const prior = emptyDyadicSocialNorm("active-interlocutor");
    const result = resolveRuntimeSocialAppraisal({
      semantic, relationshipScope: "kaira_user", relationship,
      dyadicNorm: prior, currentState: state, personality,
    });
    expect(result.dyadicApplied).toBe(false);
    expect(prior.totalObservedTurns).toBe(0);

    const next = observeCanonicalDyadicNorm(prior, semantic, "kaira_user", "2026-09-08T12:00:00.000Z");
    expect(next.totalObservedTurns).toBe(1);
    expect(prior.totalObservedTurns).toBe(0);
  });

  it("never learns the active dyad from an explicitly third-party event", () => {
    const semantic = insult(0.85, 0.05, 0.95, 0.1);
    const prior = establishedProfile("benign");
    const next = observeCanonicalDyadicNorm(prior, semantic, "third_party", "2026-09-08T12:10:00.000Z");
    expect(next).toEqual(prior);
  });
});