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

const kindsForPrimaryIntent = (result: Awaited<ReturnType<typeof understandTurkishMessage>>) =>
  result.semanticFieldProvenance?.primaryIntent?.map((item) => item.kind) ?? [];

describe("L7 typed evidence provenance kinds", () => {
  it("records typed social routine as discourse evidence, not morphology", async () => {
    const result = await understandTurkishMessage("opaque-to-this-test", {
      incomingSemanticInterpretation: fixture(),
      linguisticEvidence: { socialRoutine: "greeting" },
    });

    const kinds = kindsForPrimaryIntent(result);
    expect(kinds).toContain("discourse");
    expect(kinds).not.toContain("morphology");
  });

  it("records polar-question promotion as joint morphology + syntax evidence", async () => {
    const result = await understandTurkishMessage("opaque-to-this-test", {
      incomingSemanticInterpretation: fixture(),
      morphologyEvidenceProvider: {
        name: "provenance-question-fixture",
        async analyzeEvidence() {
          return {
            provider: "provenance-question-fixture",
            normalizedText: "opaque",
            tokens: [{
              surface: "opaque",
              analyses: [{ lemma: "mi", pos: "QUES", morphemes: ["QUES"] }],
            }],
          };
        },
      },
      linguisticEvidence: { polarQuestionClause: true },
    });

    const kinds = kindsForPrimaryIntent(result);
    expect(kinds).toContain("morphology");
    expect(kinds).toContain("syntax");
  });

  it("keeps unanimous negation provenance morphology-only", async () => {
    const result = await understandTurkishMessage("opaque-to-this-test", {
      incomingSemanticInterpretation: fixture({
        primaryIntent: "apology",
        secondarySocialActs: ["apology"],
        apology: true,
      }),
      morphologyEvidenceProvider: {
        name: "provenance-neg-fixture",
        async analyzeEvidence() {
          return {
            provider: "provenance-neg-fixture",
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

    expect(kindsForPrimaryIntent(result)).toEqual(["morphology"]);
  });
});
