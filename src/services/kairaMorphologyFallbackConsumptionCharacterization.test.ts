import { describe, expect, it } from "vitest";
import {
  understandTurkishMessage,
  type MorphologyProvider,
  type TurkishMorphologyResult,
} from "./languageUnderstandingService";

const morphologyProvider = (
  name: string,
  result: TurkishMorphologyResult,
): MorphologyProvider => ({
  name,
  async analyze() {
    return result;
  },
});

describe("Phase-7 morphology consumption characterization", () => {
  it("shows that fallback_regex currently carries morphology only as sidecar evidence", async () => {
    const message = "özür dilemiyorum";

    const negResult: TurkishMorphologyResult = {
      provider: "fixture-neg",
      normalizedText: message,
      tokens: [{
        surface: "dilemiyorum",
        lemma: "dile",
        pos: "VERB",
        morphemes: ["NEG", "PROG1", "A1SG"],
        confidence: 0.98,
      }],
    };
    const contradictoryPosResult: TurkishMorphologyResult = {
      provider: "fixture-pos",
      normalizedText: message,
      tokens: [{
        surface: "dilemiyorum",
        lemma: "dile",
        pos: "VERB",
        morphemes: ["POS", "PROG1", "A1SG"],
        confidence: 0.98,
      }],
    };

    const withNeg = await understandTurkishMessage(message, {
      morphologyProvider: morphologyProvider("fixture-neg", negResult),
    });
    const withContradictoryPos = await understandTurkishMessage(message, {
      morphologyProvider: morphologyProvider("fixture-pos", contradictoryPosResult),
    });

    expect(withNeg.semanticSource).toBe("fallback_regex");
    expect(withContradictoryPos.semanticSource).toBe("fallback_regex");
    expect(withNeg.morphology).toEqual(negResult);
    expect(withContradictoryPos.morphology).toEqual(contradictoryPosResult);

    // Current fallback semantics are independent of morphology evidence. This
    // test is characterization, not endorsement: Phase 8 must introduce any
    // morphology-aware adjudication only at the canonical L6 boundary.
    expect(withNeg.interpretation).toEqual(withContradictoryPos.interpretation);
  });

  it("keeps zero-parse morphology explicit without manufacturing semantic certainty from it", async () => {
    const message = "bugün kimlerle konuştun";
    const zeroParse: TurkishMorphologyResult = {
      provider: "fixture-zero-parse",
      normalizedText: message,
      tokens: [{
        surface: "kimlerle",
        normalized: "kimlerle",
        morphemes: [],
        confidence: 0,
      }],
    };

    const result = await understandTurkishMessage(message, {
      morphologyProvider: morphologyProvider("fixture-zero-parse", zeroParse),
    });

    expect(result.semanticSource).toBe("fallback_regex");
    expect(result.morphology).toEqual(zeroParse);
    expect(result.morphology?.tokens[0]?.confidence).toBe(0);
    expect(result.morphology?.tokens[0]?.morphemes).toEqual([]);
  });
});
