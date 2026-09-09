import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";

describe("contextual seviyorum compliment scope", () => {
  it("reported: generic preference continuation is not a compliment", async () => {
    const result = await understandTurkishMessage("ben bazen seviyorum");
    expect(result.interpretation.primaryIntent).toBe("smalltalk");
    expect(result.interpretation.valence).toBe("neutral");
    expect(result.interpretation.compliment).toBe(0);
  });

  it("neighbor-1: object preference is not a compliment", async () => {
    const result = await understandTurkishMessage("kahveyi seviyorum");
    expect(result.interpretation.primaryIntent).toBe("smalltalk");
    expect(result.interpretation.valence).toBe("neutral");
    expect(result.interpretation.compliment).toBe(0);
  });

  it("neighbor-2: bare preference predicate is not a compliment", async () => {
    const result = await understandTurkishMessage("seviyorum");
    expect(result.interpretation.primaryIntent).toBe("smalltalk");
    expect(result.interpretation.compliment).toBe(0);
  });

  it("counterexample-1: explicit Kaira-directed love remains positive", async () => {
    const result = await understandTurkishMessage("seni seviyorum");
    expect(result.interpretation.primaryIntent).toBe("compliment");
    expect(result.interpretation.valence).toBe("positive");
    expect(result.interpretation.compliment).toBeGreaterThan(0);
    expect(result.interpretation.target).toBe("kaira");
  });

  it("counterexample-2: intensified direct love remains positive", async () => {
    const result = await understandTurkishMessage("seni çok seviyorum");
    expect(result.interpretation.primaryIntent).toBe("compliment");
    expect(result.interpretation.valence).toBe("positive");
    expect(result.interpretation.compliment).toBeGreaterThan(0);
  });
});
