import { describe, expect, it } from "vitest";
import {
  understandTurkishMessage,
  type MorphologyProvider,
  type SemanticUnderstandingProvider,
} from "./languageUnderstandingService";
import { interpretSemanticEvent } from "./semanticEventEngine";

describe("language understanding gateway", () => {
  it("keeps the legacy semantic engine as a safe fallback", async () => {
    const result = await understandTurkishMessage("aptal");

    expect(result.semanticSource).toBe("fallback_regex");
    expect(result.event.intent).toBe("insult");
    expect(result.event.target).toBe("kaira");
  });

  it("can consume morphology before semantic interpretation", async () => {
    const morphologyProvider: MorphologyProvider = {
      name: "test-morphology",
      analyze: async () => ({
        provider: "test-morphology",
        normalizedText: "sen salaksın",
        tokens: [
          { surface: "sen", lemma: "sen", pos: "Pronoun" },
          {
            surface: "salaksın",
            lemma: "salak",
            pos: "Adjective",
            morphemes: ["salak", "sın"],
          },
        ],
      }),
    };

    const semanticProvider: SemanticUnderstandingProvider = {
      name: "test-semantic",
      interpret: async ({ message, morphology }) => {
        const fallback = interpretSemanticEvent("aptal");
        return {
          ...fallback,
          raw: message,
          normalized: morphology?.normalizedText ?? message,
        };
      },
    };

    const result = await understandTurkishMessage("sen salaksın", {
      morphologyProvider,
      semanticProvider,
    });

    expect(result.semanticSource).toBe("semantic_provider");
    expect(result.morphology?.tokens[1]?.lemma).toBe("salak");
    expect(result.event.intent).toBe("insult");
  });

  it("falls back when an external semantic provider fails", async () => {
    const semanticProvider: SemanticUnderstandingProvider = {
      name: "broken-semantic",
      interpret: async () => {
        throw new Error("provider unavailable");
      },
    };

    const result = await understandTurkishMessage("naber", {
      semanticProvider,
    });

    expect(result.semanticSource).toBe("fallback_regex");
    expect(result.event.intent).toBe("greeting");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
