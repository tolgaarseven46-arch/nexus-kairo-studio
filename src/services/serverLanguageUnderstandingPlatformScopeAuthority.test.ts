import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolveServerLanguageUnderstanding } from "./serverLanguageUnderstanding";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

function providerInterpretation(input: {
  normalized: string;
  target?: "kaira" | "event" | "unknown";
  platformScopeQuery?: "room_setup" | "kaira_role";
}) {
  return {
    schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
    raw: "x",
    normalized: input.normalized,
    primaryIntent: "question",
    secondarySocialActs: [],
    target: input.target ?? "unknown",
    valence: "neutral",
    severity: {
      disrespect: 0,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: 0,
    },
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
      ...(input.platformScopeQuery
        ? { platformScopeQuery: input.platformScopeQuery }
        : {}),
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
    propositions: [
      {
        id: "p1",
        content: input.normalized,
        modality: "question",
        confidence: 0.9,
        provenance: ["current_turn"],
      },
    ],
    worldMemory: { claims: [], query: null },
    uncertainty: {
      overall: 0.1,
      intent: 0.06,
      target: 0.08,
      severity: 0.04,
    },
    evidence: [
      {
        source: "llm",
        cues: ["provider_owned_platform_scope"],
        confidence: 0.94,
      },
    ],
  };
}

describe("platform-scope canonical provider authority", () => {
  it.each([
    ["sen ne yapıcaksın", "kaira"],
    ["burada ne yapıcaz", "event"],
  ] as const)(
    "does not let local fast-floor regexes enrich/overwrite full provider semantics: %s",
    async (message, target) => {
      const generateText = vi.fn(async () =>
        JSON.stringify(providerInterpretation({ normalized: message, target })),
      );

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
    },
  );

  it.each([
    "sen napıyosun burda",
    "işlevin ne senin",
    "burda ne iş yaparsın",
    "senin burada fonksiyonun ne",
    "bu sunucuda senin vazifen nedir",
  ])(
    "preserves canonical-provider Kaira-role semantics for unseen paraphrase: %s",
    async (message) => {
      const generateText = vi.fn(async () =>
        JSON.stringify(
          providerInterpretation({
            normalized: message,
            target: "kaira",
            platformScopeQuery: "kaira_role",
          }),
        ),
      );

      const result = await resolveServerLanguageUnderstanding({
        message,
        preferredProvider: "openrouter",
        firstEncounterContext: { roomName: "deneme", isOwner: true },
        context: { userName: "Tolga", characterName: "Kaira" },
        generateText,
      });

      expect(generateText).toHaveBeenCalled();
      expect(result.semanticSource).toBe("semantic_provider");
      expect(result.interpretation.discourseFacets.platformScopeQuery).toBe("kaira_role");
    },
  );

  it.each([
    "peki bu alanın olayı ne",
    "burada insanlar ne için toplanıyor",
    "bu sunucuyu nasıl kullanıyoruz",
    "bu alan neye yarıyor",
    "buradaki düzen nasıl işliyor",
  ])(
    "preserves canonical-provider room-scope semantics for unseen paraphrase: %s",
    async (message) => {
      const generateText = vi.fn(async () =>
        JSON.stringify(
          providerInterpretation({
            normalized: message,
            target: "event",
            platformScopeQuery: "room_setup",
          }),
        ),
      );

      const result = await resolveServerLanguageUnderstanding({
        message,
        preferredProvider: "openrouter",
        firstEncounterContext: { roomName: "deneme", isOwner: true },
        context: { userName: "Tolga", characterName: "Kaira" },
        generateText,
      });

      expect(generateText).toHaveBeenCalled();
      expect(result.semanticSource).toBe("semantic_provider");
      expect(result.interpretation.discourseFacets.platformScopeQuery).toBe("room_setup");
    },
  );

  it("documents platformScopeQuery as paraphrase-invariant canonical provider semantics", () => {
    const source = readFileSync(
      new URL("./llmSemanticUnderstandingProvider.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("platformScopeQuery OPTIONALDIR");
    expect(source).toContain('"room_setup"');
    expect(source).toContain('"kaira_role"');
    expect(source).toContain("paraphrase-invariant utterance anlamıyla sınıflandır");
  });

  it("keeps regex platform-scope reconciliation out of the full provider path", () => {
    const source = readFileSync(
      new URL("./serverLanguageUnderstanding.ts", import.meta.url),
      "utf8",
    );
    const providerStart = source.indexOf("const rawResult = await understandTurkishMessage");
    const fastOnlyComment = source.indexOf(
      "Regex-based room/role recognizers above are a local fast floor only",
      providerStart,
    );
    const tail = source.slice(providerStart);

    expect(providerStart).toBeGreaterThan(-1);
    expect(fastOnlyComment).toBeGreaterThan(providerStart);
    expect(tail).not.toContain("reconcileFirstEncounterContextSemantics(\n    input.message");
    expect(tail).not.toContain("reconcileFirstEncounterKairaRoleSemantics(\n    input.message");
  });
});
