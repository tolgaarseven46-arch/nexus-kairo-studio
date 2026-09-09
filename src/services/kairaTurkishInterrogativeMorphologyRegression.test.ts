import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";

describe("Turkish inflected interrogative intent", () => {
  for (const message of [
    "sen dün ne yaptın",
    "gece neredeydin",
    "bugün kimlerle konuştun",
    "şimdi neredesin",
    "birazdan ne yapacaksın",
  ]) {
    it(`reported family: ${message}`, async () => {
      const result = await understandTurkishMessage(message);
      expect(result.interpretation.primaryIntent).toBe("information_request");
    });
  }

  it("neighbor: polite/plural location form remains a question", async () => {
    const result = await understandTurkishMessage("dün neredeydiniz");
    expect(result.interpretation.primaryIntent).toBe("information_request");
  });

  it("counterexample-1: exclamatory bare ne is not promoted", async () => {
    const result = await understandTurkishMessage("ne güzel hava");
    expect(result.interpretation.primaryIntent).toBe("smalltalk");
  });

  it("counterexample-2: lexical kim prefix is not interrogative", async () => {
    const result = await understandTurkishMessage("kimya çalışıyorum");
    expect(result.interpretation.primaryIntent).toBe("smalltalk");
  });

  it("counterexample-3: neredeyse is not a location question", async () => {
    const result = await understandTurkishMessage("neredeyse bitti");
    expect(result.interpretation.primaryIntent).toBe("smalltalk");
  });
});
