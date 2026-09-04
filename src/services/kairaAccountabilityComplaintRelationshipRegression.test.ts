import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import { analyzeKdmInteractionCanonicalTurn } from "./kdmConsistencyEngine";
import { interpretSemanticEvent } from "./semanticEventEngine";

function accountabilityComplaint(
  overrides: Partial<SemanticInterpretation> = {},
): SemanticInterpretation {
  const base: SemanticInterpretation = {
    schemaVersion: "semantic-interpretation@2",
    raw: "bişey anlatmadınki sohbet bile edemedik",
    normalized: "bir şey anlatmadın ki sohbet bile edemedik",
    primaryIntent: "complaint",
    secondarySocialActs: [],
    target: "kaira",
    valence: "negative",
    severity: {
      disrespect: 0.2,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: 0,
    },
    jokingConfidence: 0.05,
    sincerityConfidence: 0.9,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0.4,
    apology: false,
    repairAttempt: false,
    stopRequest: false,
    discourseFacets: {
      socialRoutine: "none",
      discourseAct: "confusion_or_challenge",
      repairSignal: "none",
      adviceRequested: false,
      knowledgeQuery: null,
      selfMemoryQuery: null,
      relationalAct: "challenge",
      relationalIntensity: 0.4,
      stopQuestions: false,
      stopTalking: false,
    },
    uncertainty: {
      overall: 0.2,
      intent: 0.1,
      target: 0.1,
      severity: 0.25,
    },
    evidence: [{ source: "llm", cues: ["complaint", "challenge"], confidence: 0.86 }],
  };
  return { ...base, ...overrides };
}

function runCanonicalTurn(
  interpretation: SemanticInterpretation,
  state: DroitDynamicState | null = null,
) {
  return analyzeKdmInteractionCanonicalTurn(
    interpretation.raw,
    null,
    state,
    interpretation,
    interpretSemanticEvent(interpretation.raw),
    null,
  );
}

describe("accountability complaint relationship boundary", () => {
  it("does not convert a canonical complaint about Kaira into relationship injury", () => {
    const result = runCanonicalTurn(accountabilityComplaint());
    const relationship = result.nextDynamicState.relationship;

    expect(relationship?.conflictScore ?? 0).toBe(0);
    expect(relationship?.hurtScore ?? 0).toBe(0);
    expect(relationship?.negativeEvents ?? 0).toBe(0);
    expect(relationship?.lastNegativePattern).toBeUndefined();
    expect(result.trace.messageInterpretation.intent).not.toBe("tekrarlanan_olumsuz_davranış");
  });

  it("does not manufacture repeated-negative injury when the same complaint recurs", () => {
    const first = runCanonicalTurn(accountabilityComplaint());
    const second = runCanonicalTurn(accountabilityComplaint(), first.nextDynamicState);
    const relationship = second.nextDynamicState.relationship;

    expect(relationship?.conflictScore ?? 0).toBe(0);
    expect(relationship?.hurtScore ?? 0).toBe(0);
    expect(relationship?.negativeEvents ?? 0).toBe(0);
    expect(relationship?.repeatedNegativeCount ?? 0).toBe(0);
    expect(relationship?.lastNegativePattern).toBeUndefined();
    expect(second.trace.messageInterpretation.intent).not.toBe("tekrarlanan_olumsuz_davranış");
  });

  it("preserves injury when a complaint also carries an independent typed insult", () => {
    const harmful = accountabilityComplaint({
      secondarySocialActs: ["insult"],
      severity: {
        disrespect: 0.4,
        coercion: 0,
        manipulation: 0,
        privacy: 0,
        aggression: 0.3,
      },
    });
    const result = runCanonicalTurn(harmful);
    const relationship = result.nextDynamicState.relationship;

    expect(Math.max(
      relationship?.conflictScore ?? 0,
      relationship?.hurtScore ?? 0,
    )).toBeGreaterThan(0);
    expect(relationship?.negativeEvents ?? 0).toBeGreaterThan(0);
    expect(relationship?.lastNegativePattern).toBe("hakaret");
  });
});
