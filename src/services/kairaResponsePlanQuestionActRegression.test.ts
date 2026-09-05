import { describe, expect, it } from "vitest";
import { looksLikeKairaQuestionAct } from "./kairaResponsePlan";

describe("ResponsePlan punctuationless question-act production regression", () => {
  it("catches the exact question forms that escaped the 15-turn production run", () => {
    expect(
      looksLikeKairaQuestionAct(
        "oo keyifli akşam kime karşı oynuyorlar, skor ne durumda şimdi",
      ),
    ).toBe(true);
    expect(
      looksLikeKairaQuestionAct(
        "he, sen de baya dengesiz yazıyorsun şu an neyden bu kadar gerildin böyle",
      ),
    ).toBe(true);
  });

  it("does not classify nearby declarative forms as questions", () => {
    expect(looksLikeKairaQuestionAct("skor iyi durumda şimdi")).toBe(false);
    expect(looksLikeKairaQuestionAct("olan oldu şimdi")).toBe(false);
  });
});
