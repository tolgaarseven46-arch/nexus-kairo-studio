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

  it("does not let the local Kaira-role regex overwrite full semantic-provider authority", async () => {
    const providerOwned = {
      ...completeV2,
      raw: "x",
      normalized: "sen ne yapıcaksın",
      primaryIntent: "question",
      secondarySocialActs: [],
      target: "kaira",
      valence: "neutral",
      severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
      discourseFacets: {
        ...completeV2.discourseFacets,
        socialRoutine: "none",
        platformScopeQuery: undefined,
      },
      uncertainty: { overall: 0.12, intent: 0.08, target: 0.08, severity: 0.05 },
      evidence: [{ source: "llm", cues: ["provider_owned_semantics"], confidence: 0.9 }],
    };

    const generateText = vi.fn(async () => JSON.stringify(providerOwned));
    const result = await resolveServerLanguageUnderstanding({
      message: "sen ne yapıcaksın",
      preferredProvider: "openrouter",
      firstEncounterContext: { roomName: "deneme", isOwner: true },
      generateText,
      context: { userName: "Tolga", characterName: "Kaira" },
    });

    expect(generateText).toHaveBeenCalled();
    expect(result.semanticSource).toBe("semantic_provider");
    expect(result.interpretation.discourseFacets.platformScopeQuery).toBeUndefined();
  });

  it.each([
    "sen napıyosun burda",
    "işlevin ne senin",
    "burda ne iş yaparsın",
    "senin burada fonksiyonun ne",
    "bu sunucuda senin vazifen nedir",
  ])("preserves canonical-provider Kaira-role semantics for unseen paraphrase: %s", async (message) => {
    const providerOwned = {
      ...completeV2,
      raw: "x",
      normalized: message,
      primaryIntent: "question",
      secondarySocialActs: [],
      target: "kaira",
      valence: "neutral",
      severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
      discourseFacets: {
        ...completeV2.discourseFacets,
        socialRoutine: "none",
        platformScopeQuery: "kaira_role",
      },
      uncertainty: { overall: 0.1, intent: 0.06, target: 0.06, severity: 0.05 },
      evidence: [{ source: "llm", cues: ["unseen_kaira_role_paraphrase"], confidence: 0.94 }],
    };

    const generateText = vi.fn(async () => JSON.stringify(providerOwned));
    const result = await resolveServerLanguageUnderstanding({
      message,
      preferredProvider: "openrouter",
      firstEncounterContext: { roomName: "deneme", isOwner: true },
      generateText,
      context: { userName: "Tolga", characterName: "Kaira" },
    });

    expect(generateText).toHaveBeenCalled();
    expect(result.semanticSource).toBe("semantic_provider");
    expect(result.interpretation.discourseFacets.platformScopeQuery).toBe("kaira_role");
  });

});
