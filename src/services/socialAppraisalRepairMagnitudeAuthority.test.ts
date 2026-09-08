import { describe, expect, it } from "vitest";
import type { DroitDynamicState, DroitPersonalityTraits, RelationshipState } from "../types/nexus";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import {
  relationshipSignalFromRuntimeAppraisal,
  resolveRuntimeSocialAppraisal,
} from "./socialAppraisalRuntimeProjection";

const personality: DroitPersonalityTraits = {
  anger: 50,
  patience: 50,
  empathy: 50,
  emotionalSensitivity: 50,
  socialIntelligence: 50,
  selfConfidence: 50,
  humor: 50,
  communication: 50,
  charisma: 50,
  curiosity: 50,
  analyticalThinking: 50,
  creativity: 50,
  decisionMaking: 50,
  attention: 50,
  authority: 50,
  courage: 50,
  seriousness: 50,
  loyalty: 50,
  initiative: 50,
};

const state: DroitDynamicState = {
  calmness: 60,
  anger: 20,
  stress: 30,
  happiness: 55,
  confidence: 60,
  surprise: 0,
  lastStatus: "neutral",
  reactionMode: "neutral",
};

const relationship = (overrides: Partial<RelationshipState> = {}): RelationshipState => ({
  warmth: 50,
  trust: 50,
  interactionCount: 10,
  familiarityDays: 5,
  conflictScore: 15,
  hurtScore: 15,
  ...overrides,
});

function apology(sincerityConfidence: number) {
  return normalizeSemanticInterpretation({
    primaryIntent: "apology",
    secondarySocialActs: ["apology", "repair"],
    target: "kaira",
    valence: "positive",
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
    jokingConfidence: 0,
    sincerityConfidence,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0.25,
    apology: true,
    repairAttempt: true,
    uncertainty: { overall: 0.1, intent: 0.1, target: 0.05, severity: 0.1 },
    evidence: [],
  });
}

function resolveSignal(
  semantic: ReturnType<typeof normalizeSemanticInterpretation>,
  scope: "kaira_user" | "third_party" | "event" | "unknown" = "kaira_user",
  rel: RelationshipState = relationship(),
) {
  const resolution = resolveRuntimeSocialAppraisal({
    semantic,
    relationshipScope: scope,
    relationship: rel,
    currentState: state,
    personality,
  });
  return {
    resolution,
    signal: relationshipSignalFromRuntimeAppraisal(semantic, scope, null, resolution),
  };
}

describe("G4 typed repair-magnitude authority", () => {
  it("derives canonical repair base from sincerity then applies bounded G4 context modulation", () => {
    const weak = resolveSignal(apology(0.2));
    const strong = resolveSignal(apology(0.95));

    expect(weak.signal.repairStrength).toBeGreaterThan(0);
    expect(strong.signal.repairStrength).toBeGreaterThan(weak.signal.repairStrength);
    expect(strong.signal.repairStrength).toBeLessThanOrEqual(1);
    expect(strong.signal.apology).toBe(true);
    expect(strong.signal.repairAttempt).toBe(true);
  });

  it("lets relationship context modulate magnitude without changing repair direction", () => {
    const semantic = apology(0.8);
    const damaged = resolveSignal(
      semantic,
      "kaira_user",
      relationship({ warmth: 20, trust: 20, conflictScore: 60, hurtScore: 60 }),
    );
    const established = resolveSignal(
      semantic,
      "kaira_user",
      relationship({ warmth: 90, trust: 90, conflictScore: 10, hurtScore: 10, familiarityDays: 90, interactionCount: 200 }),
    );

    expect(damaged.signal.repairStrength).toBeGreaterThan(0);
    expect(established.signal.repairStrength).toBeGreaterThan(damaged.signal.repairStrength);
    expect(damaged.signal.apology).toBe(true);
    expect(established.signal.apology).toBe(true);
  });

  it("vetoes repair magnitude outside the active dyad", () => {
    const thirdParty = resolveSignal(apology(0.95), "third_party");
    expect(thirdParty.signal.repairStrength).toBe(0);
    expect(thirdParty.signal.apology).toBe(false);
    expect(thirdParty.signal.repairAttempt).toBe(false);
  });

  it("does not let hostile continuation manufacture repair from apology flags", () => {
    const hostile = normalizeSemanticInterpretation({
      primaryIntent: "insult",
      secondarySocialActs: ["insult", "apology", "repair"],
      target: "kaira",
      valence: "negative",
      severity: { disrespect: 0.8, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.4 },
      jokingConfidence: 0,
      sincerityConfidence: 0.9,
      affection: 0,
      support: 0,
      compliment: 0,
      emotionalLoad: 0.6,
      apology: true,
      repairAttempt: true,
      uncertainty: { overall: 0.1, intent: 0.1, target: 0.05, severity: 0.1 },
      evidence: [],
    });
    const { resolution, signal } = resolveSignal(hostile);

    expect(resolution.runtimeAppraisal.relational.valence).toBe("negative");
    expect(signal.repairStrength).toBe(0);
    expect(signal.apology).toBe(false);
    expect(signal.repairAttempt).toBe(false);
    expect(Math.max(...Object.values(signal.severity))).toBeGreaterThan(0);
  });
});
