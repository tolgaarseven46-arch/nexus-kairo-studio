import { describe, expect, it } from "vitest";
import { projectCanonicalBehaviorSituations } from "./behaviorSituationProjection";
import type { SemanticInterpretation } from "../types/semanticInterpretation";

const fixture = (overrides: Partial<SemanticInterpretation> = {}): SemanticInterpretation => ({
  schemaVersion: "semantic-interpretation@2",
  raw: "fixture",
  normalized: "fixture",
  primaryIntent: "smalltalk",
  secondarySocialActs: [],
  target: "unknown",
  valence: "neutral",
  severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0,
  sincerityConfidence: 0.5,
  affection: 0,
  support: 0,
  compliment: 0,
  emotionalLoad: 0,
  apology: false,
  repairAttempt: false,
  stopRequest: false,
  discourseFacets: {
    socialRoutine: "none",
    discourseAct: "none",
    repairSignal: "none",
    adviceRequested: false,
    knowledgeQuery: null,
    selfMemoryQuery: null,
    relationalAct: "none",
    relationalIntensity: 0,
    stopQuestions: false,
    stopTalking: false,
  },
  uncertainty: { overall: 0.2, intent: 0.2, target: 0.2, severity: 0.2 },
  evidence: [],
  ...overrides,
});

describe("canonical manipulation behavior neighbor proof", () => {
  it("preserves direct-Kaira canonical manipulation as an autonomy threat", () => {
    const projected = projectCanonicalBehaviorSituations(fixture({
      target: "kaira",
      secondarySocialActs: ["manipulation"],
      severity: { disrespect: 0, coercion: 0, manipulation: 0.8, privacy: 0, aggression: 0 },
    }));

    expect(projected.motivation.autonomyThreat).toBe(0.8);
  });

  it("does not turn third-party manipulation into a user-to-Kaira autonomy threat", () => {
    const projected = projectCanonicalBehaviorSituations(fixture({
      target: "third_party",
      secondarySocialActs: ["manipulation"],
      severity: { disrespect: 0, coercion: 0, manipulation: 0.8, privacy: 0, aggression: 0 },
    }));

    expect(projected.motivation.autonomyThreat).toBe(0.1);
  });

  it("keeps neutral turns at the existing autonomy-threat floor", () => {
    const projected = projectCanonicalBehaviorSituations(fixture({ target: "kaira" }));
    expect(projected.motivation.autonomyThreat).toBe(0.1);
  });
});
