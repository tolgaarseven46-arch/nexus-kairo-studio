import { describe, expect, it } from "vitest";
import { canonicalizeSemanticEvent } from "./semanticEventCanonicalizer";
import { interpretSemanticEvent } from "./semanticEventEngine";

describe("Kaira self-memory semantic authority contracts", () => {
  it("canonicalizes a provider self-fact query", () => {
    const base = interpretSemanticEvent("en sevdiğin çiçek ne?");
    const event = canonicalizeSemanticEvent("en sevdiğin çiçek ne?", {
      ...base,
      selfMemoryQuery: {
        surface: "  en sevdiğin   çiçek  ",
        scope: "self_fact",
        factKey: " Favorite Flower ",
        confidence: 1.4,
      },
    });
    expect(event.selfMemoryQuery).toEqual({
      surface: "en sevdiğin çiçek",
      scope: "self_fact",
      factKey: "favorite_flower",
      confidence: 1,
    });
  });

  it("infers targeted fallback only at the canonical semantic boundary", () => {
    const message = "senin geçmişinde başına gelen o yağmur olayını hatırlıyor musun?";
    const event = canonicalizeSemanticEvent(message, interpretSemanticEvent(message));
    expect(event.selfMemoryQuery).toMatchObject({
      scope: "autobiographical_memory",
      retrievalMode: "targeted",
    });
    expect(event.selfMemoryQuery?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("marks open-ended autobiography as broad at the canonical boundary", () => {
    const message = "senin geçmişinde neler yaşadın?";
    const event = canonicalizeSemanticEvent(message, interpretSemanticEvent(message));
    expect(event.selfMemoryQuery).toMatchObject({
      scope: "autobiographical_memory",
      retrievalMode: "broad",
    });
  });

  it("normalizes provider retrieval mode without inventing broad recall", () => {
    const message = "senin Mert'le yaşadığın olayı hatırlıyor musun?";
    const base = interpretSemanticEvent(message);
    const event = canonicalizeSemanticEvent(message, {
      ...base,
      selfMemoryQuery: {
        surface: "Mert ile yaşadığın olay",
        scope: "autobiographical_memory",
        retrievalMode: "unsupported" as never,
        confidence: 0.9,
      },
    });
    expect(event.selfMemoryQuery?.retrievalMode).toBe("targeted");
  });

  it("does not invent a fact key in deterministic fallback", () => {
    const message = "senin en sevdiğin çiçek ne?";
    const event = canonicalizeSemanticEvent(message, interpretSemanticEvent(message));
    expect(event.selfMemoryQuery).toMatchObject({ scope: "self_fact" });
    expect(event.selfMemoryQuery).not.toHaveProperty("factKey");
  });

  it("recognizes direct Kaira preference questions without requiring possessive wording", () => {
    const messages = [
      "sen neyi seversin?",
      "sen hangi müziği seversin?",
      "sen neyi tercih edersin?",
      "senin favorin ne?",
    ];

    for (const message of messages) {
      const event = canonicalizeSemanticEvent(message, interpretSemanticEvent(message));
      expect(event.selfMemoryQuery, message).toMatchObject({ scope: "self_fact" });
    }
  });

  it("does not treat bare sen as self-memory outside durable self-fact questions", () => {
    const messages = [
      "iyi senin",
      "sen nasılsın",
      "sen ne yapıyorsun",
      "gel senle barışalım",
      "sen benim kölemsin",
    ];

    for (const message of messages) {
      const event = canonicalizeSemanticEvent(message, interpretSemanticEvent(message));
      expect(event.selfMemoryQuery, message).toBeNull();
    }
  });

  it("does not turn third-party or user recall into Kaira autobiography", () => {
    const thirdParty = "Mert'in başına gelen olayı hatırlıyor musun?";
    expect(
      canonicalizeSemanticEvent(thirdParty, interpretSemanticEvent(thirdParty)).selfMemoryQuery,
    ).toBeNull();

    const userMemory = "ben geçen hafta sana ne demiştim?";
    expect(
      canonicalizeSemanticEvent(userMemory, interpretSemanticEvent(userMemory)).selfMemoryQuery,
    ).toBeNull();
  });

  it("keeps general knowledge separate from self-memory", () => {
    const message = "krizantem nedir biliyor musun?";
    const event = canonicalizeSemanticEvent(message, interpretSemanticEvent(message));
    expect(event.selfMemoryQuery).toBeNull();
  });
});
