import { describe, expect, it, vi } from "vitest";
import {
  isSafeFirstEncounterNeutralShortFastPath,
  resolveServerLanguageUnderstanding,
} from "./serverLanguageUnderstanding";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

const semanticRole = (message: string) => ({
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
  propositions: [{
    id: "p1",
    content: message,
    modality: "question",
    confidence: 0.95,
    provenance: ["current_turn"],
  }],
  worldMemory: { claims: [], query: null },
  uncertainty: { overall: 0.08, intent: 0.05, target: 0.05, severity: 0.02 },
  evidence: [{ source: "llm", cues: ["unseen_kaira_role"], confidence: 0.95 }],
});

describe("first-encounter neutral-short fast path authority", () => {
  it.each([
    "işlevin ne senin",
    "sen napıyosun burda",
    "burda ne iş yaparsın",
    "senin burada fonksiyonun ne",
  ])("fails closed to the canonical provider for unseen short role query: %s", async (message) => {
    const generateText = vi.fn(async () => JSON.stringify(semanticRole(message)));

    const result = await resolveServerLanguageUnderstanding({
      message,
      preferredProvider: "openrouter",
      preferTrivialSocialFastPath: true,
      firstEncounterContext: { roomName: "deneme", isOwner: true },
      context: {
        userName: "Tolga",
        characterName: "Kaira",
        recentMessages: [
          { role: "assistant", content: "Selam 😄 ben Kaira. Sunucuyu yönetirken yanında olacağım." },
        ],
      },
      generateText,
    });

    expect(generateText).toHaveBeenCalled();
    expect(result.semanticSource).toBe("semantic_provider");
    expect(result.interpretation.discourseFacets.platformScopeQuery).toBe("kaira_role");
    expect(result.interpretation.discourseFacets.uncertaintyAnswerShape).toBe(false);
  });

  it.each([
    "bilmiyom daha",
    "bilmiyorum daha",
    "emin değilim",
    "kararsızım",
  ])("keeps a typed uncertainty answer on the provider-free fast path: %s", async (message) => {
    const generateText = vi.fn(async () => {
      throw new Error("provider_should_not_run_for_typed_uncertainty_answer");
    });

    const result = await resolveServerLanguageUnderstanding({
      message,
      preferredProvider: "openrouter",
      preferTrivialSocialFastPath: true,
      firstEncounterContext: { roomName: "deneme", isOwner: true },
      context: {
        userName: "Tolga",
        characterName: "Kaira",
        recentMessages: [
          { role: "assistant", content: "Nasıl bir ortam olsun?" },
        ],
      },
      generateText,
    });

    expect(generateText).not.toHaveBeenCalled();
    expect(result.interpretation.discourseFacets.uncertaintyAnswerShape).toBe(true);
    expect(isSafeFirstEncounterNeutralShortFastPath(
      result,
      { roomName: "deneme", isOwner: true },
    )).toBe(true);
  });
});
