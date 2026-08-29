import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import {
  isSemanticEvent,
  resolveCanonicalSemanticEvent,
} from "./semanticEventAuthority";

describe("semanticEventAuthority", () => {
  it("reuses a valid client event as the canonical object", () => {
    const event = interpretSemanticEvent("sanane yarrm");
    const resolved = resolveCanonicalSemanticEvent("different server text", event);

    expect(resolved.source).toBe("client_shared");
    expect(resolved.event).toBe(event);
  });

  it("recomputes exactly at the server boundary when incoming data is missing", () => {
    const resolved = resolveCanonicalSemanticEvent("soyun");

    expect(resolved.source).toBe("server_recomputed");
    expect(resolved.event.intent).toBe("command");
    expect(resolved.event.target).toBe("kaira");
    expect(resolved.event.coercion).toBeGreaterThan(0);
  });

  it("rejects malformed semantic payloads instead of trusting partial objects", () => {
    const malformed = {
      raw: "özür",
      normalized: "özür",
      intent: "apology",
      valence: "positive",
    };

    expect(isSemanticEvent(malformed)).toBe(false);

    const resolved = resolveCanonicalSemanticEvent("özür", malformed);
    expect(resolved.source).toBe("server_recomputed");
    expect(resolved.event.apology).toBe(true);
  });

  it("does not silently reinterpret a valid shared event", () => {
    const event = interpretSemanticEvent("salak orospu kandırdım seni");
    const resolved = resolveCanonicalSemanticEvent("naber", event);

    expect(resolved.source).toBe("client_shared");
    expect(resolved.event.intent).toBe("insult");
    expect(resolved.event.redLine).toBe(true);
    expect(resolved.event.target).toBe("kaira");
  });
});
