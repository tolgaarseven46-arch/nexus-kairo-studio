import { describe, expect, it } from "vitest";
import type { DroitDynamicState, DroitPersonalityTraits, RelationshipState } from "../types/nexus";
import type { DyadicSocialNormProfile } from "../types/dyadicSocialNorm";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
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

const semantic = normalizeSemanticInterpretation({
  primaryIntent: "insult",
  secondarySocialActs: ["insult"],
  target: "kaira",
  valence: "negative",
  severity: { disrespect: 0.35, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0.6,
  sincerityConfidence: 0.45,
  affection: 0,
  support: 0,
  compliment: 0,
  emotionalLoad: 0.25,
  apology: false,
  repairAttempt: false,
  uncertainty: { overall: 0.45, intent: 0.45, target: 0.05, severity: 0.45 },
  evidence: [],
});

function profile(kind: "benign" | "harmful", subjectId = "active-interlocutor"): DyadicSocialNormProfile {
  return {
    version: 0,
    subjectId,
    totalObservedTurns: 3,
    evidence: {
      insult: {
        observedCount: 3,
        benignCount: kind === "benign" ? 3 : 0,
        harmfulCount: kind === "harmful" ? 3 : 0,
        mixedCount: 0,
        unknownCount: 0,
        lastObservedAt: "2026-09-08T12:00:00.000Z",
      },
    },
  };
}

function resolve(dyadicNorm?: DyadicSocialNormProfile) {
  return resolveRuntimeSocialAppraisal({
    semantic,
    relationshipScope: "kaira_user",
    relationship,
    dyadicNorm,
    currentState: state,
    personality,
  } as any);
}

describe("dyadic social norm runtime historical proof", () => {
  it("reported: persisted benign dyad evidence reaches runtime appraisal", () => {
    const result = resolve(profile("benign"));
    expect(result.dyadicApplied).toBe(true);
    expect(result.runtimeAppraisal.expectedness).toBeGreaterThan(0);
  });

  it("neighbor-1: persisted benign and harmful histories produce different harm pressure", () => {
    const benign = resolve(profile("benign"));
    const harmful = resolve(profile("harmful"));
    expect(benign.runtimeAppraisal.relational.harmEvidence)
      .toBeLessThan(harmful.runtimeAppraisal.relational.harmEvidence);
  });

  it("neighbor-2: established persisted history produces nonzero expectedness", () => {
    const result = resolve(profile("harmful"));
    expect(result.runtimeAppraisal.expectedness).toBeGreaterThan(0.4);
  });

  it("counterexample: mismatched dyad ownership remains equivalent to no dyad prior", () => {
    const mismatched = resolve(profile("benign", "someone-else"));
    const baseline = resolve();
    expect(mismatched.dyadicApplied).toBe(false);
    expect(mismatched.runtimeAppraisal.relational.harmEvidence)
      .toBe(baseline.runtimeAppraisal.relational.harmEvidence);
  });
});
