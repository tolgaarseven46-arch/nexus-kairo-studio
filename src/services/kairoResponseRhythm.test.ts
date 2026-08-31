import { describe, expect, it } from "vitest";
import { findKairoResponseRhythmIssues } from "./kairoResponseRhythm";

const history = (text: string) => [
  { sender: "user", text: "önceki mesaj" },
  { sender: "droit", text },
];

describe("Kaira response rhythm", () => {
  it("flags substantial exact repeats across recent Kaira replies", () => {
    expect(
      findKairoResponseRhythmIssues(
        "valla bugün biraz yoruldum ben de",
        history("Valla bugün biraz yoruldum ben de."),
        "natural_reaction",
      ),
    ).toContain("Kaira son mesajlarından birini anlamlı uzunlukta aynen tekrar etti");
  });

  it("normalizes punctuation and spacing before repeat comparison", () => {
    expect(
      findKairoResponseRhythmIssues(
        "bugün   baya yoğun geçti ya",
        history("Bugün baya yoğun geçti ya..."),
        "natural_reaction",
      ),
    ).toHaveLength(1);
  });

  it("allows short conversational acknowledgements to repeat naturally", () => {
    expect(findKairoResponseRhythmIssues("tamam", history("tamam"), "natural_reaction")).toEqual([]);
    expect(findKairoResponseRhythmIssues("aynen ya", history("aynen ya"), "natural_reaction")).toEqual([]);
  });

  it("does not flag a different substantial reply", () => {
    expect(
      findKairoResponseRhythmIssues(
        "bugün biraz daha sakin geçti bence",
        history("valla bugün biraz yoruldum ben de"),
        "natural_reaction",
      ),
    ).toEqual([]);
  });

  it("allows a repeated factual answer outside rhythm-sensitive social moves", () => {
    expect(
      findKairoResponseRhythmIssues(
        "cevap yine aynı çünkü gerçek değişmedi",
        history("cevap yine aynı çünkü gerçek değişmedi"),
        "answer_or_clarify",
      ),
    ).toEqual([]);
  });

  it("allows repeated grounded recall when the supported memory is unchanged", () => {
    expect(
      findKairoResponseRhythmIssues(
        "Mert yarın istifa etmeyi düşündüğünü söyledi",
        history("Mert yarın istifa etmeyi düşündüğünü söyledi"),
        "grounded_recall",
      ),
    ).toEqual([]);
  });
});
