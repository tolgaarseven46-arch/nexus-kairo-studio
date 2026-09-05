import { describe, expect, it } from "vitest";
import { isTurkishAdviceAct } from "./kairaAdviceActRecognizer";
import { isTurkishQuestionAct } from "./kairaQuestionActRecognizer";
import { removeForbiddenQuestionUnits } from "./kairaDeliveredQuestionConstraint";

describe("post-101 final delivery permission regressions", () => {
  it("recognizes measured necessity and imperative advice surfaces", () => {
    expect(isTurkishAdviceAct("o zaman yavaştan uyku moduna geçmen lazım 😄")).toBe(true);
    expect(
      isTurkishAdviceAct(
        "yatmadan önce azıcık boş yap takıl, sonra direkt dinlen bence",
      ),
    ).toBe(true);
  });

  it("does not turn ordinary observations into advice", () => {
    expect(isTurkishAdviceAct("of erkenmiş")).toBe(false);
    expect(isTurkishAdviceAct("bugün baya yorulmuşsun")).toBe(false);
  });

  it("removes a forbidden follow-up question while preserving grounded reaction content", () => {
    const candidate =
      "vay yine mi ya, kronikleşti bu çocuğun olayı\n" +
      "siz neredeydiniz buluşma mı, işe mi geç kaldı yine";
    const delivered = removeForbiddenQuestionUnits(candidate, false);

    expect(delivered).toBe("vay yine mi ya, kronikleşti bu çocuğun olayı");
    expect(isTurkishQuestionAct(delivered)).toBe(false);
  });

  it("does not manufacture content when the entire candidate is a forbidden question", () => {
    const candidate = "siz neredeydiniz buluşma mı, işe mi geç kaldı yine";
    expect(removeForbiddenQuestionUnits(candidate, false)).toBe(candidate);
  });

  it("leaves question-bearing candidates untouched when the plan allows questions", () => {
    const candidate = "hmm niye";
    expect(removeForbiddenQuestionUnits(candidate, true)).toBe(candidate);
  });
});
