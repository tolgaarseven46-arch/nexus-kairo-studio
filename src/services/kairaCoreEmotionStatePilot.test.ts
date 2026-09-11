import { describe, expect, it } from "vitest";
import type {
  DroitDynamicState,
  DroitPersonalityTraits,
  RelationshipState,
} from "../types/nexus";
import type { SocialAppraisalInput } from "../types/socialAppraisal";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { resolveSocialAppraisalG4 } from "./socialAppraisalContextModulation";

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

const relationship: RelationshipState = {
  warmthScore: 50,
  trustScore: 50,
  toleranceMultiplier: 1,
  interactionCount: 5,
  familiarityDays: 1,
  conflictScore: 0,
  hurtScore: 0,
};

const affectStates = {
  anger: { anger: 90, stress: 20, happiness: 70, calmness: 10 },
  stress: { anger: 10, stress: 90, happiness: 70, calmness: 20 },
  happiness: { anger: 10, stress: 20, happiness: 95, calmness: 70 },
  calmness: { anger: 10, stress: 20, happiness: 70, calmness: 95 },
} as const;

type AffectStateName = keyof typeof affectStates;

function state(name: AffectStateName): DroitDynamicState {
  return {
    ...affectStates[name],
    confidence: 70,
    surprise: 10,
    lastStatus: name,
    reactionMode: "neutral",
    relationship,
  };
}

const stimuli = {
  neutral: normalizeSemanticInterpretation({
    primaryIntent: "smalltalk",
    secondarySocialActs: [],
    target: "kaira",
    valence: "neutral",
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
    jokingConfidence: 0,
    sincerityConfidence: 0.9,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0,
    apology: false,
    repairAttempt: false,
    uncertainty: { overall: 0.05, intent: 0.05, target: 0.05, severity: 0.05 },
    evidence: [],
  }),
  criticism: normalizeSemanticInterpretation({
    primaryIntent: "insult",
    secondarySocialActs: ["insult"],
    target: "kaira",
    valence: "negative",
    severity: { disrespect: 0.45, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.1 },
    jokingConfidence: 0,
    sincerityConfidence: 0.9,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0.2,
    apology: false,
    repairAttempt: false,
    uncertainty: { overall: 0.1, intent: 0.05, target: 0.05, severity: 0.1 },
    evidence: [],
  }),
  apology: normalizeSemanticInterpretation({
    primaryIntent: "apology",
    secondarySocialActs: ["apology"],
    target: "kaira",
    valence: "positive",
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
    jokingConfidence: 0,
    sincerityConfidence: 0.95,
    affection: 0,
    support: 0.2,
    compliment: 0,
    emotionalLoad: 0.2,
    apology: true,
    repairAttempt: true,
    uncertainty: { overall: 0.05, intent: 0.05, target: 0.05, severity: 0.05 },
    evidence: [],
  }),
} as const;

type StimulusName = keyof typeof stimuli;

function resolve(affect: AffectStateName, stimulus: StimulusName) {
  const input: SocialAppraisalInput = {
    semantic: stimuli[stimulus],
    relationship,
    currentState: state(affect),
    personality,
  };
  return resolveSocialAppraisalG4(input, "active-interlocutor");
}

const matrixCases = (Object.keys(affectStates) as AffectStateName[]).flatMap((affect) =>
  (Object.keys(stimuli) as StimulusName[]).map((stimulus) => ({ affect, stimulus })),
);

describe("Core emotion-state pilot matrix", () => {
  it.each(matrixCases)(
    "$affect × $stimulus preserves semantic/relationship direction and bounded projection",
    ({ affect, stimulus }) => {
      const result = resolve(affect, stimulus);

      expect(result.contextFactors.relationalHarm).toBeGreaterThanOrEqual(0.7);
      expect(result.contextFactors.relationalHarm).toBeLessThanOrEqual(1.3);
      expect(result.contextFactors.relationalRepair).toBeGreaterThanOrEqual(0.7);
      expect(result.contextFactors.relationalRepair).toBeLessThanOrEqual(1.3);
      expect(result.contextFactors.affectiveNegative).toBeGreaterThanOrEqual(0.7);
      expect(result.contextFactors.affectiveNegative).toBeLessThanOrEqual(1.3);
      expect(result.contextFactors.affectivePositive).toBeGreaterThanOrEqual(0.7);
      expect(result.contextFactors.affectivePositive).toBeLessThanOrEqual(1.3);
      expect(result.contextFactors.activation).toBeGreaterThanOrEqual(0.7);
      expect(result.contextFactors.activation).toBeLessThanOrEqual(1.3);

      if (stimulus === "neutral") {
        expect(result.appraisal.noMaterialEffect).toBe(true);
        expect(result.appraisal.relational.significance).toBe(0);
        expect(result.appraisal.affective.significance).toBe(0);
      } else if (stimulus === "criticism") {
        expect(result.appraisal.relational.valence).toBe("negative");
        expect(result.appraisal.relational.harmEvidence).toBeGreaterThan(0);
        expect(result.appraisal.relational.repairEvidence).toBe(0);
        expect(result.appraisal.affective.valence).toBe("negative");
      } else {
        expect(result.appraisal.relational.valence).not.toBe("negative");
        expect(result.appraisal.relational.harmEvidence).toBe(0);
        expect(result.appraisal.relational.repairEvidence).toBeGreaterThan(0);
        expect(result.appraisal.affective.valence).not.toBe("negative");
      }
    },
  );

  it("keeps current affect out of durable relationship meaning for the same criticism", () => {
    const results = (Object.keys(affectStates) as AffectStateName[]).map((affect) => resolve(affect, "criticism"));
    const harm = results.map((result) => result.appraisal.relational.harmEvidence);
    const relationalSignificance = results.map((result) => result.appraisal.relational.significance);

    expect(new Set(harm).size).toBe(1);
    expect(new Set(relationalSignificance).size).toBe(1);
  });

  it("lets anger/stress amplify negative affect while calmness damps activation", () => {
    const anger = resolve("anger", "criticism");
    const stress = resolve("stress", "criticism");
    const calm = resolve("calmness", "criticism");

    expect(anger.appraisal.affective.significance).toBeGreaterThan(calm.appraisal.affective.significance);
    expect(stress.appraisal.affective.significance).toBeGreaterThan(calm.appraisal.affective.significance);
    expect(anger.appraisal.affective.activation).toBeGreaterThan(calm.appraisal.affective.activation);
    expect(stress.appraisal.affective.activation).toBeGreaterThan(calm.appraisal.affective.activation);
  });

  it("lets happiness amplify positive affect without manufacturing extra repair meaning", () => {
    const happy = resolve("happiness", "apology");
    const calm = resolve("calmness", "apology");

    expect(happy.appraisal.affective.significance).toBeGreaterThan(calm.appraisal.affective.significance);
    expect(happy.appraisal.relational.repairEvidence).toBe(calm.appraisal.relational.repairEvidence);
    expect(happy.appraisal.relational.harmEvidence).toBe(0);
    expect(calm.appraisal.relational.harmEvidence).toBe(0);
  });
});
