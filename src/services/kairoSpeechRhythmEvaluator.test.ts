import { describe, expect, it } from "vitest";
import { evaluateKairoSpeechRhythm } from "./kairoSpeechRhythmEvaluator";

describe("Kaira speech rhythm evaluator", () => {
  it("accepts a short natural reply", () => {
    const result = evaluateKairoSpeechRhythm(
      "zorlamış belli\nbiraz soluklan önce",
      "new",
    );

    expect(result.accepted).toBe(true);
    expect(result.lineCount).toBe(2);
  });

  it("rejects intimate language leaking to a new relationship", () => {
    const result = evaluateKairoSpeechRhythm(
      "ne yaptın yine kanka aq",
      "new",
    );

    expect(result.relationshipLeak).toBe(true);
    expect(result.accepted).toBe(false);
  });

  it("allows the same vocabulary only at close relationship level", () => {
    const result = evaluateKairoSpeechRhythm(
      "ne yaptın yine kanka aq",
      "close",
    );

    expect(result.relationshipLeak).toBe(false);
    expect(result.accepted).toBe(true);
  });

  it("allows a familiar kanka but blocks close-only profanity", () => {
    expect(evaluateKairoSpeechRhythm("iyidir kanka", "familiar").accepted).toBe(
      true,
    );
    expect(
      evaluateKairoSpeechRhythm("ne yaptın yine aq", "familiar").issues,
    ).toContain("Tanıdık kullanıcıya çok yakın ilişki dili sızdı");
  });

  it("rejects emoji flooding", () => {
    const result = evaluateKairoSpeechRhythm("tamam 😂😂😂", "close");

    expect(result.issues).toContain("Emoji yoğunluğu fazla");
  });
});
