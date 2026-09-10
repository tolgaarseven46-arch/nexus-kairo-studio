import { describe, expect, it } from "vitest";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";

const floor = (message: string) => interpretationFromRegexFloor(message);

const expectDevaluation = (message: string) => {
  const reading = floor(message);
  expect(reading.target).toBe("kaira");
  expect(reading.severity.disrespect).toBeGreaterThan(0);
  expect(reading.secondarySocialActs).toContain("challenge");
  expect(reading.discourseFacets.relationalAct).toBe("challenge");
};

describe("dismissive rhetorical semantic floor neighbor proof", () => {
  it("reported: recognizes the captured dismissive competence question", () => {
    expectDevaluation("sen bu işlerden harbi ne anlarsın");
  });

  it("neighbor-1: recognizes a dismissive knowledge question with a different predicate and stance position", () => {
    expectDevaluation("sen ne bilirsin zaten");
  });

  it("neighbor-2: recognizes a dismissive capability question with a different predicate", () => {
    expectDevaluation("sen bu konuda sanki ne yaparsın");
  });

  it("counterexample: literal information questions remain non-devaluing", () => {
    const literal = [
      floor("bu konuda ne biliyorsun?"),
      floor("bu işlerden ne anlıyorsun?"),
      floor("sen bu konuda ne biliyorsun?"),
    ];

    for (const reading of literal) {
      expect(reading.severity.disrespect).toBe(0);
      expect(reading.secondarySocialActs).not.toContain("challenge");
    }
  });

  it("keeps joking context visible without erasing the underlying devaluation", () => {
    const plain = floor("sen bu işlerden harbi ne anlarsın");
    const joking = floor("sen bu işlerden harbi ne anlarsın 😄 şaka yapıyorum");

    expect(joking.target).toBe("kaira");
    expect(joking.severity.disrespect).toBeGreaterThan(0);
    expect(joking.severity.disrespect).toBeLessThan(plain.severity.disrespect);
    expect(joking.jokingConfidence).toBeGreaterThan(plain.jokingConfidence);
  });

  it("preserves explicit repair semantics alongside a dismissive rhetorical cue", () => {
    const repaired = floor("sen ne bilirsin zaten, pardon öyle demek istemedim");
    const deniedApology = floor("özür dilemiyorum");

    expect(repaired.severity.disrespect).toBeGreaterThan(0);
    expect(repaired.apology).toBe(true);
    expect(deniedApology.apology).toBe(false);
  });
});
