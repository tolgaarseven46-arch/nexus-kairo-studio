import { describe, expect, it } from "vitest";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";

function selfMemory(message: string) {
  return interpretationFromRegexFloor(message).discourseFacets.selfMemoryQuery;
}

describe("fallback self-memory ingress bug-class neighbor proof", () => {
  it("reported: preserves a direct Kaira favorite self-fact query at regex-floor ingress", () => {
    expect(selfMemory("senin en sevdiğin çiçek ne?")).toMatchObject({
      scope: "self_fact",
      retrievalMode: "targeted",
    });
  });

  it("neighbor-1: preserves a direct Kaira preference self-fact query at regex-floor ingress", () => {
    expect(selfMemory("sen hangi müziği seversin?")).toMatchObject({
      scope: "self_fact",
    });
  });

  it("neighbor-2: preserves targeted autobiographical recall at regex-floor ingress", () => {
    expect(selfMemory("senin geçmişinde başına gelen o yağmur olayını hatırlıyor musun?")).toMatchObject({
      scope: "autobiographical_memory",
      retrievalMode: "targeted",
    });
  });

  it("counterexample: does not manufacture Kaira self-memory for a third-party recall question", () => {
    expect(selfMemory("Mert'in başına gelen olayı hatırlıyor musun?")).toBeNull();
  });
});
