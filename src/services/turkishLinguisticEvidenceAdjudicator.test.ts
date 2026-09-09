import { describe, expect, it } from "vitest";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { reconcileSemanticInterpretationWithLinguisticEvidence } from "./turkishLinguisticEvidenceAdjudicator";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

const base = (overrides: Record<string, unknown> = {}) => normalizeSemanticInterpretation({
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
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
  uncertainty: { overall: 0.5, intent: 0.5, target: 0.5, severity: 0.5 },
  evidence: [],
  ...overrides,
});

describe("canonical Turkish linguistic-evidence adjudicator", () => {
  it("blocks apology only from unanimous NEG evidence", () => {
    const input = base({
      primaryIntent: "apology",
      secondarySocialActs: ["apology"],
      apology: true,
    });
    const result = reconcileSemanticInterpretationWithLinguisticEvidence(input, {
      apologyCandidate: true,
      morphology: {
        provider: "fixture",
        normalizedText: "özür dilemiyorum",
        tokens: [{
          surface: "dilemiyorum",
          analyses: [
            { lemma: "dil", pos: "VERB", morphemes: ["ABLE", "NEG", "PROG1", "A1SG"] },
            { lemma: "dile", pos: "VERB", morphemes: ["NEG", "PROG1", "A1SG"] },
          ],
        }],
      },
    });
    expect(result.apology).toBe(false);
    expect(result.primaryIntent).toBe("smalltalk");
    expect(result.evidence.at(-1)?.cues).toContain("morphology_unanimous_NEG_blocks_apology");
  });

  it("does not use ambiguous NEG evidence as authority", () => {
    const input = base({ primaryIntent: "apology", secondarySocialActs: ["apology"], apology: true });
    const result = reconcileSemanticInterpretationWithLinguisticEvidence(input, {
      apologyCandidate: true,
      morphology: {
        provider: "fixture",
        normalizedText: "fixture",
        tokens: [{
          surface: "fixture",
          analyses: [
            { lemma: "x", morphemes: ["NEG"] },
            { lemma: "x", morphemes: ["POS"] },
          ],
        }],
      },
    });
    expect(result.apology).toBe(true);
    expect(result.primaryIntent).toBe("apology");
  });

  it("promotes QUES only when clause scope is typed", () => {
    const result = reconcileSemanticInterpretationWithLinguisticEvidence(base(), {
      polarQuestionClause: true,
      morphology: {
        provider: "fixture",
        normalizedText: "fixture",
        tokens: [{ surface: "mı", analyses: [{ lemma: "mi", pos: "QUES", morphemes: ["QUES", "PRES", "A3SG"] }] }],
      },
    });
    expect(result.primaryIntent).toBe("information_request");
    expect(result.evidence.at(-1)?.cues).toContain("morphology_QUES_with_typed_polar_clause");
  });

  it("widens uncertainty for ambiguous QUES without clause scope", () => {
    const result = reconcileSemanticInterpretationWithLinguisticEvidence(base(), {
      morphology: {
        provider: "fixture",
        normalizedText: "mi",
        tokens: [{
          surface: "mi",
          analyses: [
            { lemma: "mi", pos: "NOUN", morphemes: ["A3SG", "PNON", "NOM"] },
            { lemma: "mi", pos: "QUES", morphemes: ["QUES", "PRES", "A3SG"] },
          ],
        }],
      },
    });
    expect(result.primaryIntent).toBe("smalltalk");
    expect(result.uncertainty.intent).toBeGreaterThanOrEqual(0.65);
    expect(result.uncertainty.ambiguousReadings).toContain("question_particle_vs_non_question_homograph");
  });

  it("does nothing for lemma-only legacy evidence", () => {
    const input = base();
    const result = reconcileSemanticInterpretationWithLinguisticEvidence(input, {
      morphology: {
        provider: "zemberek_rest",
        normalizedText: "arkadaşına",
        tokens: [{ surface: "arkadaşına", analyses: [{ lemma: "arkadaş", morphemes: [] }] }],
      },
    });
    expect(result).toEqual(input);
  });
});
