import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

const fixture = (overrides: Record<string, unknown> = {}) => normalizeSemanticInterpretation({
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  raw: "fixture",
  normalized: "fixture",
  primaryIntent: "other",
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
  uncertainty: { overall: 0.55, intent: 0.55, target: 0.55, severity: 0.2 },
  evidence: [],
  ...overrides,
});

type UnderstandingResult = Awaited<ReturnType<typeof understandTurkishMessage>>;
const evidenceCues = (result: UnderstandingResult) =>
  result.interpretation.evidence.flatMap((item) => item.cues);

describe("bounded local semantic runtime acceptance", () => {
  it.each([
    ["greeting", "greeting", "greeting"],
    ["how_are_you", "smalltalk", "how_are_you"],
    ["what_doing", "smalltalk", "what_doing"],
  ] as const)("accepts typed %s routine at canonical L6", async (routine, intent, expectedRoutine) => {
    const result = await understandTurkishMessage("opaque-to-this-test", {
      incomingSemanticInterpretation: fixture(),
      linguisticEvidence: { socialRoutine: routine },
    });

    expect(result.interpretation.primaryIntent).toBe(intent);
    expect(result.interpretation.discourseFacets.socialRoutine).toBe(expectedRoutine);
    expect(evidenceCues(result)).toContain(`typed_social_routine:${routine}`);
    expect(result.interpretation.uncertainty.intent).toBeLessThanOrEqual(0.2);
  });

  it("accepts simple typed negation as a blocker, never as standalone invented semantics", async () => {
    const result = await understandTurkishMessage("opaque-to-this-test", {
      incomingSemanticInterpretation: fixture({
        primaryIntent: "apology",
        secondarySocialActs: ["apology"],
        apology: true,
      }),
      morphologyEvidenceProvider: {
        name: "bounded-neg-fixture",
        async analyzeEvidence() {
          return {
            provider: "bounded-neg-fixture",
            normalizedText: "opaque",
            tokens: [{
              surface: "opaque",
              analyses: [
                { lemma: "x", pos: "VERB", morphemes: ["NEG"] },
                { lemma: "x", pos: "VERB", morphemes: ["NEG", "A1SG"] },
              ],
            }],
          };
        },
      },
      linguisticEvidence: { apologyCandidate: true },
    });

    expect(result.interpretation.apology).toBe(false);
    expect(result.interpretation.primaryIntent).toBe("smalltalk");
    expect(result.semanticFieldProvenance?.apology?.at(-1)?.cues).toContain(
      "morphology_unanimous_NEG_blocks_apology",
    );
  });

  it("accepts a polar question only when QUES is paired with typed clause scope", async () => {
    const result = await understandTurkishMessage("opaque-to-this-test", {
      incomingSemanticInterpretation: fixture(),
      morphologyEvidenceProvider: {
        name: "bounded-question-fixture",
        async analyzeEvidence() {
          return {
            provider: "bounded-question-fixture",
            normalizedText: "opaque",
            tokens: [{ surface: "opaque", analyses: [{ lemma: "mi", pos: "QUES", morphemes: ["QUES"] }] }],
          };
        },
      },
      linguisticEvidence: { polarQuestionClause: true },
    });

    expect(result.interpretation.primaryIntent).toBe("information_request");
    expect(evidenceCues(result)).toContain("morphology_QUES_with_typed_polar_clause");
  });

  it("rejects ambiguous QUES promotion without typed clause scope", async () => {
    const result = await understandTurkishMessage("opaque-to-this-test", {
      incomingSemanticInterpretation: fixture(),
      morphologyEvidenceProvider: {
        name: "bounded-ambiguous-question-fixture",
        async analyzeEvidence() {
          return {
            provider: "bounded-ambiguous-question-fixture",
            normalizedText: "opaque",
            tokens: [{
              surface: "opaque",
              analyses: [
                { lemma: "mi", pos: "NOUN", morphemes: ["A3SG", "NOM"] },
                { lemma: "mi", pos: "QUES", morphemes: ["QUES"] },
              ],
            }],
          };
        },
      },
    });

    expect(result.interpretation.primaryIntent).toBe("other");
    expect(result.interpretation.uncertainty.intent).toBeGreaterThanOrEqual(0.65);
    expect(result.interpretation.uncertainty.ambiguousReadings).toContain(
      "question_particle_vs_non_question_homograph",
    );
  });

  it("keeps zero-parse evidence fully abstaining", async () => {
    const incoming = fixture();
    const result = await understandTurkishMessage("opaque-to-this-test", {
      incomingSemanticInterpretation: incoming,
      morphologyEvidenceProvider: {
        name: "bounded-zero-parse-fixture",
        async analyzeEvidence() {
          return {
            provider: "bounded-zero-parse-fixture",
            normalizedText: "opaque",
            tokens: [{ surface: "opaque", analyses: [] }],
          };
        },
      },
      linguisticEvidence: { polarQuestionClause: true },
    });

    expect(result.interpretation.primaryIntent).toBe("other");
    expect(result.interpretation.uncertainty.intent).toBe(incoming.uncertainty.intent);
  });
});
