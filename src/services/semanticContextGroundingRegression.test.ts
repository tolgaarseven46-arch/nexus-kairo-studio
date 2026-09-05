import { describe, expect, it, vi } from "vitest";
import { createLlmSemanticUnderstandingProvider } from "./llmSemanticUnderstandingProvider";
import { understandTurkishMessage } from "./languageUnderstandingService";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION, type SemanticInterpretation } from "../types/semanticInterpretation";

function semantic(overrides: Partial<SemanticInterpretation> = {}): SemanticInterpretation {
  return {
    schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
    raw: "x",
    normalized: "x",
    primaryIntent: "smalltalk",
    secondarySocialActs: [],
    target: "unknown",
    valence: "neutral",
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
    jokingConfidence: 0.1,
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
    ...overrides,
  };
}

const warmContext = {
  userName: "Mert",
  characterName: "Kaira",
  recentMessages: [
    { role: "user" as const, content: "naber" },
    { role: "assistant" as const, content: "iyi valla sen nasılsın" },
  ],
};

describe("semantic context grounding regression", () => {
  it("rejects prior-turn socialRoutine projection while preserving current-turn smalltalk", async () => {
    const contextual = semantic({
      raw: "iyi maç izliyorum",
      normalized: "iyi maç izliyorum",
      primaryIntent: "greeting",
      discourseFacets: {
        ...semantic().discourseFacets,
        socialRoutine: "how_are_you",
      },
      uncertainty: { overall: 0.18, intent: 0.18, target: 0.3, severity: 0.2 },
    });
    const contextFree = semantic({
      raw: "iyi maç izliyorum",
      normalized: "iyi maç izliyorum",
      primaryIntent: "smalltalk",
      target: "event",
      valence: "positive",
      uncertainty: { overall: 0.2, intent: 0.2, target: 0.25, severity: 0.2 },
    });
    const generate = vi.fn()
      .mockResolvedValueOnce(JSON.stringify(contextual))
      .mockResolvedValueOnce(JSON.stringify(contextFree));
    const provider = createLlmSemanticUnderstandingProvider({ generate });

    const result = await understandTurkishMessage("iyi maç izliyorum", {
      semanticProvider: provider,
      context: warmContext,
    });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.interpretation.primaryIntent).toBe("smalltalk");
    expect(result.interpretation.discourseFacets.socialRoutine).toBe("none");
    expect(result.interpretation.grounding?.adjudicatedAgainstContextFree).toBe(true);
    expect(result.interpretation.grounding?.contextInfluencedFields).toEqual(expect.arrayContaining(["primaryIntent", "socialRoutine"]));
    expect(result.interpretation.grounding?.rejectedContextFields).toEqual(expect.arrayContaining(["primaryIntent", "socialRoutine"]));
  });

  it("keeps a real current-turn routine when context-free and contextual readings agree", async () => {
    const naber = semantic({
      raw: "naber",
      normalized: "naber",
      primaryIntent: "greeting",
      discourseFacets: { ...semantic().discourseFacets, socialRoutine: "how_are_you" },
      uncertainty: { overall: 0.1, intent: 0.1, target: 0.2, severity: 0.1 },
    });
    const generate = vi.fn().mockResolvedValue(JSON.stringify(naber));
    const provider = createLlmSemanticUnderstandingProvider({ generate });
    const result = await understandTurkishMessage("naber", { semanticProvider: provider, context: warmContext });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.interpretation.primaryIntent).toBe("greeting");
    expect(result.interpretation.discourseFacets.socialRoutine).toBe("how_are_you");
    expect(result.interpretation.grounding?.rejectedContextFields).toEqual([]);
  });

  it("keeps short-token non-invention on the same grounding seam", async () => {
    const contextual = semantic({
      raw: "sg",
      normalized: "sg",
      primaryIntent: "smalltalk",
      secondarySocialActs: ["affection", "closeness_bid"],
      target: "kaira",
      valence: "positive",
      affection: 0.75,
      discourseFacets: { ...semantic().discourseFacets, socialRoutine: "thanks", relationalAct: "closeness_bid", relationalIntensity: 0.5 },
      uncertainty: { overall: 0.5, intent: 0.5, target: 0.4, severity: 0.2 },
    });
    const contextFree = semantic({
      raw: "sg",
      normalized: "sg",
      primaryIntent: "other",
      target: "unknown",
      valence: "neutral",
      uncertainty: { overall: 0.8, intent: 0.8, target: 0.8, severity: 0.5 },
    });
    const generate = vi.fn()
      .mockResolvedValueOnce(JSON.stringify(contextual))
      .mockResolvedValueOnce(JSON.stringify(contextFree));
    const provider = createLlmSemanticUnderstandingProvider({ generate });
    const result = await understandTurkishMessage("sg", { semanticProvider: provider, context: warmContext });

    expect(result.interpretation.primaryIntent).toBe("other");
    expect(result.interpretation.valence).toBe("neutral");
    expect(result.interpretation.affection).toBe(0);
    expect(result.interpretation.grounding?.rejectedContextFields).toContain("primaryIntent");
    expect(result.interpretation.grounding?.rejectedContextFields).toContain("socialRoutine");
  });
});
