import { describe, expect, it } from "vitest";
import type {
  DroitDynamicState,
  DroitPersonalityTraits,
  RelationshipState,
} from "../types/nexus";
import type { SocialAppraisalInput } from "../types/socialAppraisal";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { resolveSocialAppraisalG4 } from "./socialAppraisalContextModulation";

const personality = (
  overrides: Partial<DroitPersonalityTraits> = {},
): DroitPersonalityTraits => ({
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
  ...overrides,
});

const state = (
  overrides: Partial<DroitDynamicState> = {},
): DroitDynamicState => ({
  calmness: 50,
  anger: 50,
  stress: 50,
  happiness: 50,
  confidence: 50,
  surprise: 0,
  lastStatus: "neutral",
  reactionMode: "neutral",
  ...overrides,
});

const relationship = (
  overrides: Partial<RelationshipState> = {},
): RelationshipState => ({
  warmthScore: 50,
  trustScore: 50,
  toleranceMultiplier: 1,
  interactionCount: 1,
  familiarityDays: 0,
  conflictScore: 0,
  hurtScore: 0,
  ...overrides,
});

function semantic(overrides: Record<string, unknown> = {}) {
  return normalizeSemanticInterpretation({
    primaryIntent: "smalltalk",
    secondarySocialActs: [],
    target: "kaira",
    valence: "neutral",
    severity: {
      disrespect: 0,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: 0,
    },
    jokingConfidence: 0,
    sincerityConfidence: 0.8,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0,
    apology: false,
    repairAttempt: false,
    uncertainty: {
      overall: 0.1,
      intent: 0.1,
      target: 0.1,
      severity: 0.1,
    },
    evidence: [],
    ...overrides,
  });
}

function insult(target: "kaira" | "third_party" = "kaira") {
  return semantic({
    primaryIntent: "insult",
    secondarySocialActs: ["insult"],
    target,
    valence: "negative",
    severity: {
      disrespect: 0.55,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: 0.2,
    },
    emotionalLoad: 0.2,
    uncertainty: {
      overall: 0.2,
      intent: 0.1,
      target: 0.05,
      severity: 0.2,
    },
  });
}

function input(
  overrides: Partial<SocialAppraisalInput> = {},
): SocialAppraisalInput {
  return {
    semantic: semantic(),
    relationship: relationship(),
    currentState: state(),
    personality: personality(),
    ...overrides,
  };
}

describe("SocialAppraisal G4 bounded context modulation", () => {
  it("preserves literal exact zero even under highly reactive state/personality", () => {
    const result = resolveSocialAppraisalG4(
      input({
        personality: personality({ emotionalSensitivity: 100, patience: 0 }),
        currentState: state({ anger: 100, stress: 100, calmness: 0 }),
        relationship: relationship({ warmthScore: 0, trustScore: 0, toleranceMultiplier: 0.5 }),
      }),
      "alice",
    );

    expect(result.appraisal.noMaterialEffect).toBe(true);
    expect(result.appraisal.relational.significance).toBe(0);
    expect(result.appraisal.affective.significance).toBe(0);
    expect(result.contextFactors).toEqual({
      relationalHarm: 1,
      relationalRepair: 1,
      relationalAffiliation: 1,
      affectiveNegative: 1,
      affectivePositive: 1,
      activation: 1,
    });
  });

  it("buffers the same Kaira-targeted harm in an established warm/trusting dyad without erasing it", () => {
    const event = insult();
    const newDyad = resolveSocialAppraisalG4(
      input({
        semantic: event,
        relationship: relationship({ warmthScore: 20, trustScore: 20, toleranceMultiplier: 0.8 }),
      }),
      "alice",
    );
    const establishedDyad = resolveSocialAppraisalG4(
      input({
        semantic: event,
        relationship: relationship({ warmthScore: 90, trustScore: 90, toleranceMultiplier: 1.4, familiarityDays: 30 }),
      }),
      "alice",
    );

    expect(establishedDyad.appraisal.relational.harmEvidence).toBeLessThan(
      newDyad.appraisal.relational.harmEvidence,
    );
    expect(establishedDyad.appraisal.relational.harmEvidence).toBeGreaterThan(0);
    expect(establishedDyad.appraisal.relational.valence).toBe("negative");
  });

  it("lets current angry/stressed state amplify affective pressure without inventing extra relationship meaning", () => {
    const event = insult();
    const calm = resolveSocialAppraisalG4(
      input({
        semantic: event,
        currentState: state({ anger: 5, stress: 10, calmness: 90 }),
      }),
      "alice",
    );
    const activated = resolveSocialAppraisalG4(
      input({
        semantic: event,
        currentState: state({ anger: 95, stress: 90, calmness: 5 }),
      }),
      "alice",
    );

    expect(activated.appraisal.affective.significance).toBeGreaterThan(
      calm.appraisal.affective.significance,
    );
    expect(activated.appraisal.affective.activation).toBeGreaterThan(
      calm.appraisal.affective.activation,
    );
    expect(activated.appraisal.relational.harmEvidence).toBe(
      calm.appraisal.relational.harmEvidence,
    );
  });

  it("keeps third-party harm relationship-neutral after personality/state modulation", () => {
    const result = resolveSocialAppraisalG4(
      input({
        semantic: insult("third_party"),
        personality: personality({ emotionalSensitivity: 100, patience: 0 }),
        currentState: state({ anger: 100, stress: 100, calmness: 0 }),
      }),
      "alice",
    );

    expect(result.appraisal.relational.significance).toBe(0);
    expect(result.appraisal.relational.harmEvidence).toBe(0);
    expect(result.appraisal.affective.significance).toBeGreaterThan(0);
  });

  it("modulates intensity but never flips the resolved projection valence", () => {
    const event = insult();
    const reactive = resolveSocialAppraisalG4(
      input({
        semantic: event,
        personality: personality({ emotionalSensitivity: 100, patience: 0 }),
      }),
      "alice",
    );
    const buffered = resolveSocialAppraisalG4(
      input({
        semantic: event,
        personality: personality({ emotionalSensitivity: 0, patience: 100 }),
      }),
      "alice",
    );

    expect(reactive.appraisal.relational.valence).toBe("negative");
    expect(buffered.appraisal.relational.valence).toBe("negative");
    expect(reactive.appraisal.relational.harmEvidence).toBeGreaterThan(
      buffered.appraisal.relational.harmEvidence,
    );
  });
});
