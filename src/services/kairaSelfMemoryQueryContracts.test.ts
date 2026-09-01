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

  it("infers fallback only at the canonical semantic boundary", () => {
    const message = "senin geçmişinde başına gelen o yağmur olayını hatırlıyor musun?";
    const event = canonicalizeSemanticEvent(message, interpretSemanticEvent(message));
    expect(event.selfMemoryQuery).toMatchObject({
      scope: "autobiographical_memory",
    });
    expect(event.selfMemoryQuery?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("does not invent a fact key in deterministic fallback", () => {
    const message = "senin en sevdiğin çiçek ne?";
    const event = canonicalizeSemanticEvent(message, interpretSemanticEvent(message));
    expect(event.selfMemoryQuery).toMatchObject({ scope: "self_fact" });
    expect(event.selfMemoryQuery).not.toHaveProperty("factKey");
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
