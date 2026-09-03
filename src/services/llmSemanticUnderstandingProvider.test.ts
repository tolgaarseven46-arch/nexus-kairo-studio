import { describe, expect, it, vi } from "vitest";
import { createLlmSemanticUnderstandingProvider } from "./llmSemanticUnderstandingProvider";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

const base = {
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  raw: "x",
  normalized: "x",
  primaryIntent: "smalltalk",
  secondarySocialActs: [],
  target: "unknown",
  valence: "neutral",
  severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0,
  sincerityConfidence: 0.7,
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
  evidence: [{ source: "llm", cues: [], confidence: 0.8 }],
} as const;

describe("llm semantic understanding provider", () => {
  it("forces original raw text and accepts complete SemanticInterpretation@2 JSON", async () => {
    const generate = vi.fn(async () =>
      JSON.stringify({
        ...base,
        raw: "model bunu değiştirmeye çalıştı",
        normalized: "kaira sen salaksın",
        primaryIntent: "insult",
        secondarySocialActs: ["insult"],
        target: "kaira",
        valence: "negative",
        severity: { disrespect: 0.9, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.45 },
      }),
    );

    const provider = createLlmSemanticUnderstandingProvider({ generate });
    const interpretation = await provider.interpret({
      message: "Kaira sen salaksın",
      morphology: {
        provider: "zemberek",
        normalizedText: "kaira sen salaksın",
        tokens: [{ surface: "salaksın", lemma: "salak", morphemes: ["A3sg", "Pnon", "Nom"] }],
      },
      context: { characterName: "Kaira", userName: "Ali" },
    });

    expect(interpretation.raw).toBe("Kaira sen salaksın");
    expect(interpretation.primaryIntent).toBe("insult");
    expect(interpretation.secondarySocialActs).toContain("insult");
    expect(interpretation.target).toBe("kaira");
    expect(interpretation.severity.disrespect).toBe(0.9);
    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0]![0].prompt).toContain("lemma=salak");
  });

  it("extracts complete v2 JSON even if a provider wraps it in extra text", async () => {
    const generate = vi.fn(async () => `sonuç: ${JSON.stringify({ ...base, normalized: "mal aldım" })}`);
    const provider = createLlmSemanticUnderstandingProvider({ generate });
    const interpretation = await provider.interpret({ message: "mal aldım" });

    expect(interpretation.primaryIntent).toBe("smalltalk");
    expect(interpretation.secondarySocialActs).not.toContain("insult");
  });

  it("rejects incomplete payloads instead of manufacturing canonical fields", async () => {
    const provider = createLlmSemanticUnderstandingProvider({
      generate: async () => JSON.stringify({ primaryIntent: "insult", target: "kaira" }),
    });
    await expect(provider.interpret({ message: "aptal" })).rejects.toThrow(/incomplete\/invalid/i);
  });
});
