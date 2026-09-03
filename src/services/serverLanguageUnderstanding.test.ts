import { describe, expect, it, vi } from "vitest";
import { resolveServerLanguageUnderstanding } from "./serverLanguageUnderstanding";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

const completeV2 = {
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  raw: "x",
  normalized: "mert bana salak dedi",
  primaryIntent: "insult",
  secondarySocialActs: ["insult"],
  target: "third_party",
  valence: "negative",
  severity: { disrespect: 0.8, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.25 },
  jokingConfidence: 0,
  sincerityConfidence: 0.85,
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
  uncertainty: { overall: 0.15, intent: 0.1, target: 0.1, severity: 0.2 },
  evidence: [{ source: "llm", cues: ["Mert", "salak dedi"], confidence: 0.9 }],
};

describe("server language understanding bridge", () => {
  it("uses the LLM semantic provider when it returns complete v2", async () => {
    const generateText = vi.fn(async () => JSON.stringify(completeV2));

    const result = await resolveServerLanguageUnderstanding({
      message: "Mert bana salak dedi",
      preferredProvider: "openrouter",
      generateText,
      context: { userName: "Ali", characterName: "Kaira" },
    });

    expect(result.semanticSource).toBe("semantic_provider");
    expect(result.interpretation.schemaVersion).toBe(SEMANTIC_INTERPRETATION_SCHEMA_VERSION);
    expect(result.interpretation.target).toBe("third_party");
    expect(result.event.target).toBe("third_party");
    expect(result.interpretation.raw).toBe("Mert bana salak dedi");
  });

  it("falls back instead of trusting incomplete LLM v2", async () => {
    const generateText = vi.fn(async () => JSON.stringify({ primaryIntent: "insult", target: "kaira" }));

    const result = await resolveServerLanguageUnderstanding({
      message: "aptal",
      preferredProvider: "openrouter",
      generateText,
    });

    expect(result.semanticSource).toBe("fallback_regex");
    expect(result.interpretation.schemaVersion).toBe(SEMANTIC_INTERPRETATION_SCHEMA_VERSION);
    expect(result.event.insult).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
