import { describe, expect, it } from "vitest";
import {
  understandTurkishMessage,
  type MorphologyProvider,
  type SemanticUnderstandingProvider,
} from "./languageUnderstandingService";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

describe("language understanding gateway", () => {
  it("keeps regex only as an explicit v2 fallback producer", async () => {
    const result = await understandTurkishMessage("aptal");

    expect(result.semanticSource).toBe("fallback_regex");
    expect(result.interpretation.schemaVersion).toBe(SEMANTIC_INTERPRETATION_SCHEMA_VERSION);
    expect(result.interpretation.primaryIntent).toBe("insult");
    expect(result.event.intent).toBe("insult");
    expect(result.event.target).toBe("kaira");
  });

  it("can consume morphology before canonical v2 semantic interpretation", async () => {
    const morphologyProvider: MorphologyProvider = {
      name: "test-morphology",
      analyze: async () => ({
        provider: "test-morphology",
        normalizedText: "sen salaksın",
        tokens: [
          { surface: "sen", lemma: "sen", pos: "Pronoun" },
          { surface: "salaksın", lemma: "salak", pos: "Adjective", morphemes: ["salak", "sın"] },
        ],
      }),
    };

    const semanticProvider: SemanticUnderstandingProvider = {
      name: "test-semantic",
      interpret: async ({ message, morphology }) => ({
        ...interpretationFromRegexFloor("aptal"),
        raw: message,
        normalized: morphology?.normalizedText ?? message,
      }),
    };

    const result = await understandTurkishMessage("sen salaksın", {
      morphologyProvider,
      semanticProvider,
    });

    expect(result.semanticSource).toBe("semantic_provider");
    expect(result.morphology?.tokens[1]?.lemma).toBe("salak");
    expect(result.interpretation.primaryIntent).toBe("insult");
    expect(result.event.intent).toBe("insult");
  });

  it("drops an autobiographical query that contradicts a canonical third-party target", async () => {
    const base = interpretationFromRegexFloor("peki ben onda en çok hangi özelliğini seviyordum");
    const semanticProvider: SemanticUnderstandingProvider = {
      name: "test-semantic",
      interpret: async () => ({
        ...base,
        primaryIntent: "question",
        target: "third_party",
        discourseFacets: {
          ...base.discourseFacets,
          selfMemoryQuery: {
            surface: "onda en çok hangi özelliğini seviyordum",
            scope: "autobiographical_memory",
            retrievalMode: "targeted",
            confidence: 0.75,
          },
        },
      }),
    };

    const result = await understandTurkishMessage("peki ben onda en çok hangi özelliğini seviyordum", {
      semanticProvider,
    });

    expect(result.interpretation.target).toBe("third_party");
    expect(result.interpretation.discourseFacets.selfMemoryQuery).toBeNull();
    expect(result.event.selfMemoryQuery).toBeNull();
    expect(result.interpretation.evidence.some((entry) =>
      entry.source === "reconciled" && entry.cues.includes("self_memory_query_requires_kaira_target")
    )).toBe(true);
  });

  it("preserves autobiographical recall when the canonical target is Kaira", async () => {
    const base = interpretationFromRegexFloor("sen hangi takımlısın");
    const selfMemoryQuery = {
      surface: "hangi takımlısın",
      scope: "self_fact" as const,
      retrievalMode: "targeted" as const,
      factKey: "sports.team",
      confidence: 0.9,
    };
    const semanticProvider: SemanticUnderstandingProvider = {
      name: "test-semantic",
      interpret: async () => ({
        ...base,
        primaryIntent: "question",
        target: "kaira",
        discourseFacets: {
          ...base.discourseFacets,
          selfMemoryQuery,
        },
      }),
    };

    const result = await understandTurkishMessage("sen hangi takımlısın", {
      semanticProvider,
    });

    expect(result.interpretation.target).toBe("kaira");
    expect(result.interpretation.discourseFacets.selfMemoryQuery).toEqual(selfMemoryQuery);
    expect(result.event.selfMemoryQuery).toEqual(selfMemoryQuery);
  });

  it("falls back when an external semantic provider fails", async () => {
    const semanticProvider: SemanticUnderstandingProvider = {
      name: "broken-semantic",
      interpret: async () => { throw new Error("provider unavailable"); },
    };

    const result = await understandTurkishMessage("naber", { semanticProvider });

    expect(result.semanticSource).toBe("fallback_regex");
    expect(result.interpretation.schemaVersion).toBe(SEMANTIC_INTERPRETATION_SCHEMA_VERSION);
    expect(result.event.intent).toBe("greeting");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
