import { describe, expect, it, vi } from "vitest";
import { resolveServerLanguageUnderstanding } from "./serverLanguageUnderstanding";

describe("server language understanding bridge", () => {
  it("uses the LLM semantic provider when it returns a complete event", async () => {
    const generateText = vi.fn(async () =>
      JSON.stringify({
        raw: "x",
        normalized: "mert bana salak dedi",
        intent: "insult",
        valence: "negative",
        target: "third_party",
        relationalAct: "none",
        relationalIntensity: 0,
        severity: 0.7,
        insult: true,
        redLine: false,
        disrespect: 0.8,
        coercion: 0,
        manipulation: 0,
        privacyViolation: 0,
        apology: false,
        repairAttempt: false,
        stopQuestions: false,
        stopTalking: false,
        frustration: 0.2,
        emotionalLoad: 0,
        affection: 0,
        support: 0,
        compliment: 0,
      }),
    );

    const result = await resolveServerLanguageUnderstanding({
      message: "Mert bana salak dedi",
      preferredProvider: "openrouter",
      generateText,
      context: { userName: "Ali", characterName: "Kaira" },
    });

    expect(result.semanticSource).toBe("semantic_provider");
    expect(result.event.target).toBe("third_party");
    expect(result.event.raw).toBe("Mert bana salak dedi");
  });

  it("falls back instead of trusting an incomplete LLM event", async () => {
    const generateText = vi.fn(async () =>
      JSON.stringify({ intent: "insult", target: "kaira" }),
    );

    const result = await resolveServerLanguageUnderstanding({
      message: "aptal",
      preferredProvider: "openrouter",
      generateText,
    });

    expect(result.semanticSource).toBe("fallback_regex");
    expect(result.event.insult).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
