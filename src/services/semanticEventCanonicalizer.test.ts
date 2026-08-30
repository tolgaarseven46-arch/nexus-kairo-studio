import { describe, expect, it } from "vitest";
import { canonicalizeSemanticEvent } from "./semanticEventCanonicalizer";
import { interpretSemanticEvent } from "./semanticEventEngine";

describe("semantic event canonicalizer", () => {
  it("fills omitted social and discourse facets for older/provider events", () => {
    const base = interpretSemanticEvent("normal bir mesaj");
    const event = {
      ...base,
      raw: "nasılsın",
      normalized: "nasılsın",
      intent: "greeting" as const,
      socialRoutine: undefined,
      discourseAct: undefined,
      adviceRequested: undefined,
    };

    const result = canonicalizeSemanticEvent("nasılsın", event);
    expect(result.socialRoutine).toBe("how_are_you");
    expect(result.discourseAct).toBe("none");
    expect(result.adviceRequested).toBe(false);
  });

  it("preserves authoritative provider facets when present", () => {
    const base = interpretSemanticEvent("moralim bozuk ne yapmalıyım");
    const event = {
      ...base,
      socialRoutine: "none" as const,
      discourseAct: "topic_shift" as const,
      adviceRequested: false,
    };

    const result = canonicalizeSemanticEvent("moralim bozuk ne yapmalıyım", event);
    expect(result.socialRoutine).toBe("none");
    expect(result.discourseAct).toBe("topic_shift");
    expect(result.adviceRequested).toBe(false);
  });
});
