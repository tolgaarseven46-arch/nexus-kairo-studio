import { describe, expect, it } from "vitest";
import { isTurkishQuestionAct } from "./kairaQuestionActRecognizer";

describe("question-act bug-class neighbor proof", () => {
  it("reported: recognizes captured bare-ne second-person question", () => {
    expect(isTurkishQuestionAct("aç bi şeyler de ortam değişsin, ne tarz açıyosun şimdi")).toBe(true);
  });

  it("neighbor-1: recognizes a neighboring bare-ne second-person music question", () => {
    expect(isTurkishQuestionAct("ne tür müzik dinliyosun şimdi")).toBe(true);
  });

  it("neighbor-2: recognizes a neighboring bare-ne second-person selection question", () => {
    expect(isTurkishQuestionAct("ne şarkı açıyon şimdi")).toBe(true);
  });

  it("counterexample: does not treat an exclamatory bare-ne phrase as a question", () => {
    expect(isTurkishQuestionAct("ne güzel açmışsın")).toBe(false);
    expect(isTurkishQuestionAct("ne bileyim ya")).toBe(false);
  });
});
