import { describe, expect, it } from "vitest";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import {
  relationshipSignalFromRuntimeAppraisal,
  resolveRuntimeSocialAppraisal,
} from "./socialAppraisalRuntimeProjection";
import { NEUTRAL_DROIT_PERSONALITY } from "./droitPersonalityNormalizer";

const relationship = {
  warmth: 40,
  trust: 40,
  conflictScore: 24,
  hurtScore: 28,
  repairProgress: 0,
  interactionCount: 20,
  familiarityDays: 20,
} as any;

const currentState = {
  calmness: 55,
  anger: 20,
  stress: 35,
  happiness: 45,
  confidence: 60,
  surprise: 0,
  lastStatus: "hurt",
  reactionMode: "hurt",
} as any;

function semantic(target: "unknown" | "self" | "third_party" | "event") {
  return normalizeSemanticInterpretation({
    primaryIntent: "apology",
    secondarySocialActs: ["apology", "repair"],
    target,
    valence: "positive",
    severity: {
      disrespect: 0,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: 0,
    },
    jokingConfidence: 0,
    sincerityConfidence: 0.95,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0.3,
    apology: true,
    repairAttempt: true,
    uncertainty: {
      overall: 0.1,
      intent: 0.05,
      target: target === "unknown" ? 0.6 : 0.05,
      severity: 0.05,
    },
    evidence: [],
  });
}

function resolve(target: "unknown" | "self" | "third_party" | "event", scope: "kaira_user" | "third_party" | "event") {
  const event = semantic(target);
  const resolution = resolveRuntimeSocialAppraisal({
    semantic: event,
    relationshipScope: scope,
    relationship,
    currentState,
    personality: NEUTRAL_DROIT_PERSONALITY,
  });
  return {
    resolution,
    signal: relationshipSignalFromRuntimeAppraisal(event, scope, null, resolution),
  };
}

describe("grounded active-dyad appraisal regression", () => {
  it("lets typed kaira_user grounding resolve an otherwise unknown apology target", () => {
    const { resolution, signal } = resolve("unknown", "kaira_user");

    expect(resolution.runtimeAppraisal.relational.repairEvidence).toBeGreaterThan(0);
    expect(resolution.runtimeAppraisal.relational.valence).toBe("positive");
    expect(signal.targetsKaira).toBe(true);
    expect(signal.apology).toBe(true);
    expect(signal.repairAttempt).toBe(true);
  });

  it("does not let active-dyad grounding override an explicit self target", () => {
    const { resolution, signal } = resolve("self", "kaira_user");

    expect(resolution.runtimeAppraisal.relational.repairEvidence).toBe(0);
    expect(signal.apology).toBe(false);
    expect(signal.repairAttempt).toBe(false);
  });

  it("still lets explicit third-party grounding veto relational repair", () => {
    const { resolution, signal } = resolve("unknown", "third_party");

    expect(resolution.runtimeAppraisal.relational.significance).toBe(0);
    expect(signal.targetsKaira).toBe(false);
    expect(signal.apology).toBe(false);
    expect(signal.repairAttempt).toBe(false);
  });
});
