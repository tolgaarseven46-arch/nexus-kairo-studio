import { describe, expect, it } from "vitest";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";

function interpretation(message: string) {
  return interpretationFromRegexFloor(message);
}

describe("fallback self-memory ingress bug-class neighbor proof", () => {
  it("reported: preserves a direct Kaira favorite self-fact query at regex-floor ingress", () => {
    const result = interpretation("senin en sevdiğin çiçek ne?");
    expect(result.target).toBe("kaira");
    expect(result.discourseFacets.selfMemoryQuery).toMatchObject({
      scope: "self_fact",
      retrievalMode: "targeted",
    });
  });

  it("neighbor-1: preserves a direct Kaira preference self-fact query at regex-floor ingress", () => {
    const result = interpretation("sen hangi müziği seversin?");
    expect(result.target).toBe("kaira");
    expect(result.discourseFacets.selfMemoryQuery).toMatchObject({
      scope: "self_fact",
    });
  });

  it("neighbor-2: preserves targeted autobiographical recall at regex-floor ingress", () => {
    const result = interpretation("senin geçmişinde başına gelen o yağmur olayını hatırlıyor musun?");
    expect(result.target).toBe("kaira");
    expect(result.discourseFacets.selfMemoryQuery).toMatchObject({
      scope: "autobiographical_memory",
      retrievalMode: "targeted",
    });
  });

  it("counterexample: does not manufacture Kaira self-memory for a third-party recall question", () => {
    const result = interpretation("Mert'in başına gelen olayı hatırlıyor musun?");
    expect(result.discourseFacets.selfMemoryQuery).toBeNull();
    expect(result.target).not.toBe("kaira");
  });
});
