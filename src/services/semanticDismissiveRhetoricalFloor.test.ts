import { describe, expect, it } from "vitest";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";

const floor = (message: string) => interpretationFromRegexFloor(message);

describe("dismissive rhetorical semantic floor", () => {
  it("distinguishes direct social devaluation from literal information questions", () => {
    const dismissive = [
      floor("sen bu işlerden harbi ne anlarsın"),
      floor("sen ne bilirsin zaten"),
    ];
    const literal = [
      floor("bu konuda ne biliyorsun?"),
      floor("bu işlerden ne anlıyorsun?"),
    ];

    for (const reading of dismissive) {
      expect(reading.target).toBe("kaira");
      expect(reading.severity.disrespect).toBeGreaterThan(0);
      expect(reading.secondarySocialActs).toContain("challenge");
    }

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

    expect(repaired.severity.disrespect).toBeGreaterThan(0);
    expect(repaired.apology).toBe(true);
  });
});
