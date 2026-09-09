import { describe, expect, it } from "vitest";
import { adaptLegacyMorphologyEvidence } from "./turkishMorphologyEvidenceAdapter";

describe("legacy morphology evidence adapter", () => {
  it("preserves a legacy chosen analysis without inventing alternatives", () => {
    const evidence = adaptLegacyMorphologyEvidence({
      provider: "fixture",
      normalizedText: "özür dilemiyorum",
      tokens: [{
        surface: "dilemiyorum",
        normalized: "dilemiyorum",
        lemma: "dile",
        pos: "VERB",
        morphemes: ["NEG", "PROG1", "A1SG"],
        confidence: 0.9,
      }],
    });

    expect(evidence.tokens[0]?.analyses).toEqual([{
      lemma: "dile",
      pos: "VERB",
      morphemes: ["NEG", "PROG1", "A1SG"],
      confidence: 0.9,
    }]);
    expect(evidence.tokens[0]?.preferredAnalysisIndex).toBe(0);
  });

  it("preserves lemma-only Zemberek output as weak single-analysis evidence", () => {
    const evidence = adaptLegacyMorphologyEvidence({
      provider: "zemberek_rest",
      normalizedText: "arkadaşına",
      tokens: [{ surface: "arkadaşına", lemma: "arkadaş" }],
    });

    expect(evidence.tokens[0]?.analyses).toEqual([{
      lemma: "arkadaş",
      morphemes: [],
    }]);
  });

  it("preserves an empty legacy token as explicit zero-parse evidence", () => {
    const evidence = adaptLegacyMorphologyEvidence({
      provider: "fixture",
      normalizedText: "kimlerle",
      tokens: [{ surface: "kimlerle", confidence: 0 }],
    });

    expect(evidence.tokens[0]?.analyses).toEqual([]);
    expect(evidence.tokens[0]?.preferredAnalysisIndex).toBeUndefined();
  });
});
