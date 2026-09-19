import { describe, expect, it, vi } from "vitest";
import { resolveServerLanguageUnderstanding } from "./serverLanguageUnderstanding";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

const roleSemantic = (message: string) => ({
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  raw: message,
  normalized: message,
  primaryIntent: "question",
  secondarySocialActs: [],
  target: "kaira",
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
    platformScopeQuery: "kaira_role",
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
  propositions: [{ id: "p1", content: message, modality: "question", confidence: 0.95, provenance: ["current_turn"] }],
  worldMemory: { claims: [], query: null },
  uncertainty: { overall: 0.08, intent: 0.05, target: 0.05, severity: 0.02 },
  evidence: [{ source: "llm", cues: ["neighbor_proof"], confidence: 0.95 }],
});

describe("neutral-short fast-path neighbor proof regression", () => {
  it.each([
    "işlevin ne senin",
    "sen napıyosun burda",
    "burda ne iş yaparsın",
  ])("neighbor unseen role query reaches provider: %s", async (message) => {
    const generateText = vi.fn(async () => JSON.stringify(roleSemantic(message)));
    const result = await resolveServerLanguageUnderstanding({
      message,
      preferredProvider: "openrouter",
      preferTrivialSocialFastPath: true,
      firstEncounterContext: { roomName: "deneme", isOwner: true },
      context: { userName: "Tolga", characterName: "Kaira" },
      generateText,
    });

    expect(generateText).toHaveBeenCalled();
    expect(result.interpretation.discourseFacets.platformScopeQuery).toBe("kaira_role");
  });

  it.each(["bilmiyom daha", "emin değilim", "kararsızım"])(
    "counterexample uncertainty reply stays provider-free: %s",
    async (message) => {
      const generateText = vi.fn(async () => {
        throw new Error("provider_should_not_run");
      });
      const result = await resolveServerLanguageUnderstanding({
        message,
        preferredProvider: "openrouter",
        preferTrivialSocialFastPath: true,
        firstEncounterContext: { roomName: "deneme", isOwner: true },
        context: {
          userName: "Tolga",
          characterName: "Kaira",
          recentMessages: [{ role: "assistant", content: "Nasıl bir ortam olsun?" }],
        },
        generateText,
      });

      expect(generateText).not.toHaveBeenCalled();
      expect(result.interpretation.discourseFacets.uncertaintyAnswerShape).toBe(true);
    },
  );
});
