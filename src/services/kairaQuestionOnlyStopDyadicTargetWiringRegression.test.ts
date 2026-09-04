import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("question-only stop dyadic target wiring regression", () => {
  it("treats typed question-only stop facets as interlocutor-target evidence without overriding third-party or event scope", () => {
    const source = readFileSync(
      new URL("./kdmRelationshipReducerBridge.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("const questionOnlyStopAddressesInterlocutor =");
    expect(source).toContain("interp.discourseFacets.stopQuestions === true");
    expect(source).toContain("interp.discourseFacets.stopTalking === false");
    expect(source).toContain("interp.stopRequest === false");
    expect(source).toContain("!thirdParty");
    expect(source).toContain('event.relationshipScope !== "event"');
    expect(source).toContain('(interp.target === "kaira" || questionOnlyStopAddressesInterlocutor)');
  });
});
