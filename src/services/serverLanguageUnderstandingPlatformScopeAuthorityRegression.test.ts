import { describe, expect, it, vi } from "vitest";
import { resolveServerLanguageUnderstanding } from "./serverLanguageUnderstanding";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

function interpretation(message: string, platformScopeQuery?: "room_setup" | "kaira_role") {
  return {
    schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
    raw: message,
    normalized: message,
    primaryIntent: "question",
    secondarySocialActs: [],
    target: platformScopeQuery === "kaira_role" ? "kaira" : "event",
    valence: "neutral",
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
    jokingConfidence: 0,
    sincerityConfidence: 0.9,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0,
    apology: false,
    repairAttempt: false,
    stopRequest: false,
    discourseFacets: {
      socialRoutine: "none",
      ...(platformScopeQuery ? { platformScopeQuery } : {}),
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
    propositions: [{
      id: "p1",
      content: message,
      modality: "question",
      confidence: 0.9,
      provenance: ["current_turn"],
    }],
    worldMemory: { claims: [], query: null },
    uncertainty: { overall: 0.1, intent: 0.05, target: 0.05, severity: 0.05 },
    evidence: [{ source: "llm", cues: ["platform_scope_regression"], confidence: 0.95 }],
  };
}

describe("platform-scope canonical provider regression", () => {
  it.each([
    ["işlevin ne senin", "kaira_role"],
    ["bu sunucuyu nasıl kullanıyoruz", "room_setup"],
  ] as const)("preserves unseen provider-owned scope: %s", async (message, scope) => {
    const generateText = vi.fn(async () => JSON.stringify(interpretation(message, scope)));
    const result = await resolveServerLanguageUnderstanding({
      message,
      preferredProvider: "openrouter",
      firstEncounterContext: { roomName: "deneme", isOwner: true },
      context: { userName: "Tolga", characterName: "Kaira" },
      generateText,
    });

    expect(generateText).toHaveBeenCalled();
    expect(result.semanticSource).toBe("semantic_provider");
    expect(result.interpretation.discourseFacets.platformScopeQuery).toBe(scope);
  });

  it("does not let fast-floor regex enrich provider output after provider execution", async () => {
    const message = "sen ne yapıcaksın";
    const generateText = vi.fn(async () => JSON.stringify(interpretation(message)));

    const result = await resolveServerLanguageUnderstanding({
      message,
      preferredProvider: "openrouter",
      firstEncounterContext: { roomName: "deneme", isOwner: true },
      context: { userName: "Tolga", characterName: "Kaira" },
      generateText,
    });

    expect(generateText).toHaveBeenCalled();
    expect(result.semanticSource).toBe("semantic_provider");
    expect(result.interpretation.discourseFacets.platformScopeQuery).toBeUndefined();
  });

  it.each([
    "bu sunucuda sana düşen sorumluluk ne",
    "burada hangi işleri üstleniyorsun",
    "bu ortamda senin görev alanın tam olarak ne",
    "burada bulunma amacın ne",
  ])("classifies structural durable-role paraphrase on first-encounter fast floor: %s", async (message) => {
    const generateText = vi.fn(async () => {
      throw new Error("semantic provider must not be needed for structural Kaira-role fast floor");
    });

    const result = await resolveServerLanguageUnderstanding({
      message,
      preferredProvider: "openrouter",
      preferTrivialSocialFastPath: true,
      firstEncounterContext: { roomName: "deneme", isOwner: true },
      context: { userName: "Tolga", characterName: "Kaira" },
      generateText,
    });

    expect(generateText).not.toHaveBeenCalled();
    expect(result.interpretation.discourseFacets.platformScopeQuery).toBe("kaira_role");
    expect(result.interpretation.target).toBe("kaira");
  });

  it("does not turn ambiguous momentary what_doing into durable Kaira-role fast-floor semantics", async () => {
    const message = "sen napıyosun burda";
    const generateText = vi.fn(async () => JSON.stringify(interpretation(message)));

    const result = await resolveServerLanguageUnderstanding({
      message,
      preferredProvider: "openrouter",
      preferTrivialSocialFastPath: true,
      firstEncounterContext: { roomName: "deneme", isOwner: true },
      context: { userName: "Tolga", characterName: "Kaira" },
      generateText,
    });

    expect(generateText).toHaveBeenCalled();
    expect(result.interpretation.discourseFacets.platformScopeQuery).toBeUndefined();
  });

});
