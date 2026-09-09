import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

const semanticFixture = (overrides: Record<string, unknown> = {}) => normalizeSemanticInterpretation({
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

describe("language-understanding typed linguistic evidence runtime", () => {
  it("uses rich L2 morphology only at canonical L6 and records field provenance", async () => {
    const result = await understandTurkishMessage("özür dilemiyorum", {
      incomingSemanticInterpretation: semanticFixture({
        primaryIntent: "apology",
        secondarySocialActs: ["apology"],
        apology: true,
      }),
      morphologyEvidenceProvider: {
        name: "fixture-rich-morphology",
        async analyzeEvidence() {
          return {
            provider: "fixture-rich-morphology",
            normalizedText: "özür dilemiyorum",
            tokens: [{
              surface: "dilemiyorum",
              analyses: [
                { lemma: "dile", pos: "VERB", morphemes: ["NEG", "PROG1", "A1SG"] },
                { lemma: "dile", pos: "VERB", morphemes: ["NEG", "PROG1", "A1SG"] },
              ],
            }],
          };
        },
      },
      linguisticEvidence: { apologyCandidate: true },
    });

    expect(result.semanticSource).toBe("client_shared");
    expect(result.interpretation.apology).toBe(false);
    expect(result.interpretation.primaryIntent).toBe("smalltalk");
    expect(result.morphologyEvidence?.provider).toBe("fixture-rich-morphology");
    expect(result.semanticFieldProvenance?.apology?.at(-1)?.kind).toBe("morphology");
    expect(result.semanticFieldProvenance?.primaryIntent?.at(-1)?.cues).toContain(
      "morphology_unanimous_NEG_blocks_apology",
    );
  });

  it("preserves zero-parse abstention in the production gateway", async () => {
    const incoming = semanticFixture({
      primaryIntent: "apology",
      secondarySocialActs: ["apology"],
      apology: true,
    });
    const result = await understandTurkishMessage("kimlerle", {
      incomingSemanticInterpretation: incoming,
      morphologyEvidenceProvider: {
        name: "fixture-zero-parse",
        async analyzeEvidence() {
          return {
            provider: "fixture-zero-parse",
            normalizedText: "kimlerle",
            tokens: [{ surface: "kimlerle", analyses: [] }],
          };
        },
      },
      linguisticEvidence: { apologyCandidate: true, polarQuestionClause: true },
    });

    expect(result.interpretation.apology).toBe(true);
    expect(result.interpretation.primaryIntent).toBe("apology");
    expect(result.semanticFieldProvenance).toBeUndefined();
  });

  it("passes provider-neutral morphology evidence to the semantic provider without granting it separate authority", async () => {
    let receivedProvider: string | undefined;
    const result = await understandTurkishMessage("iyi misin", {
      morphologyEvidenceProvider: {
        name: "fixture-rich-morphology",
        async analyzeEvidence() {
          return {
            provider: "fixture-rich-morphology",
            normalizedText: "iyi misin",
            tokens: [{
              surface: "misin",
              analyses: [{ lemma: "mi", pos: "QUES", morphemes: ["QUES", "PRES", "A2SG"] }],
            }],
          };
        },
      },
      semanticProvider: {
        name: "fixture-semantic",
        async interpret(input) {
          receivedProvider = input.morphologyEvidence?.provider;
          return semanticFixture();
        },
      },
      linguisticEvidence: { polarQuestionClause: true },
    });

    expect(receivedProvider).toBe("fixture-rich-morphology");
    expect(result.semanticSource).toBe("semantic_provider");
    expect(result.interpretation.primaryIntent).toBe("information_request");
    expect(result.semanticFieldProvenance?.primaryIntent?.at(-1)?.confidence).toBeGreaterThan(0.9);
  });
});
