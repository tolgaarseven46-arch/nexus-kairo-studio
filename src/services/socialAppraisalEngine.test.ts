import { describe, expect, it } from "vitest";
import type { DroitDynamicState, RelationshipState } from "../types/nexus";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { semanticNegativePattern } from "./kdmRelationshipReducerBridge";
import { computeBehaviorProfile } from "./droitBehaviorEngine";
import { applyRelationshipContext } from "./relationshipBehaviorService";
import {
  appraiseRelationshipContext,
  socialExpectedness,
  socialNegativePattern,
} from "./socialAppraisalEngine";

function semantic(input: Record<string, unknown>) {
  return normalizeSemanticInterpretation({
    schemaVersion: "semantic-interpretation@2",
    raw: "fixture",
    normalized: "fixture",
    primaryIntent: "other",
    secondarySocialActs: [],
    target: "kaira",
    valence: "neutral",
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
    jokingConfidence: 0,
    sincerityConfidence: 1,
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
    uncertainty: { overall: 0, intent: 0, target: 0, severity: 0 },
    evidence: [],
    ...input,
  }, "fixture");
}

function dynamicState(relationship: RelationshipState): DroitDynamicState {
  return {
    calmness: 70,
    anger: 10,
    stress: 20,
    happiness: 70,
    confidence: 70,
    surprise: 10,
    lastStatus: "fixture",
    reactionMode: "neutral",
    relationship,
  };
}

describe("SocialAppraisal parity extraction", () => {
  it("preserves existing negative-pattern decisions", () => {
    const cases = [
      semantic({ primaryIntent: "insult", severity: { disrespect: 0.4, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.2 } }),
      semantic({ primaryIntent: "insult", severity: { disrespect: 0.9, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.7 } }),
      semantic({ primaryIntent: "complaint", severity: { disrespect: 0.2, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.3 } }),
      semantic({ secondarySocialActs: ["coercion"], severity: { disrespect: 0, coercion: 0.5, manipulation: 0, privacy: 0, aggression: 0 } }),
      semantic({ secondarySocialActs: ["privacy_violation"], severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0.5, aggression: 0 } }),
      semantic({ primaryIntent: "rejection" }),
    ];

    for (const current of cases) {
      expect(socialNegativePattern(current)).toBe(semanticNegativePattern(current));
    }
  });

  it("preserves relationship-context categorical thresholds", () => {
    const relationships: RelationshipState[] = [
      { familiarityDays: 1, interactionCount: 1, warmth: 50, trust: 50, conflictScore: 0, hurtScore: 0, repairProgress: 0 },
      { familiarityDays: 30, interactionCount: 50, warmth: 82, trust: 85, conflictScore: 5, hurtScore: 4, repairProgress: 0, positiveEvents: 8 },
      { familiarityDays: 30, interactionCount: 50, warmth: 28, trust: 30, conflictScore: 58, hurtScore: 55, repairProgress: 0, negativeEvents: 8 },
      { familiarityDays: 30, interactionCount: 50, warmth: 60, trust: 65, conflictScore: 22, hurtScore: 22, repairProgress: 30, positiveEvents: 5, negativeEvents: 2 },
    ];

    for (const relationship of relationships) {
      const appraisal = appraiseRelationshipContext(relationship);
      const projected = applyRelationshipContext(computeBehaviorProfile(null), dynamicState(relationship));
      const debug = projected.debugMatrix.synthesizedParameters;

      expect(appraisal.closeness).toBeCloseTo(Number(debug.relationshipCloseness), 8);
      expect(appraisal.damagedRelationship).toBe(Boolean(debug.relationshipDamaged));
      expect(appraisal.severelyDamagedRelationship).toBe(Boolean(debug.relationshipSeverelyDamaged));
    }
  });

  it("reuses the existing expectedness math", () => {
    const context = {
      relationshipAgeMinutes: 60 * 24 * 30,
      interactionCount: 20,
      similarEventsFromSource: 3,
      similarEventsRecentGlobal: 4,
      distinctSourcesRecentGlobal: 2,
      minutesSinceLastSimilarEvent: 60,
    };
    expect(socialExpectedness(context)).toBeGreaterThan(0);
    expect(socialExpectedness(context)).toBeLessThanOrEqual(1);
  });
});
