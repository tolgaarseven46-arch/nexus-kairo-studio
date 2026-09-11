import { describe, expect, it } from "vitest";
import { isTurkishAdviceAct } from "./kairaAdviceActRecognizer";

describe("isTurkishAdviceAct", () => {
  it("detects nominalized 'daha iyi olur' advice", () => {
    expect(isTurkishAdviceAct("aranızda kalması daha iyi olur")).toBe(true);
  });

  it("detects measured direct self-care advice leakage", () => {
    expect(isTurkishAdviceAct("yoğunken yazman bile fazla aslında, kendine dön biraz bugün")).toBe(true);
    expect(isTurkishAdviceAct("bugün biraz kendine odaklan")).toBe(true);
  });

  it("does not classify plain supportive acknowledgements as advice", () => {
    expect(isTurkishAdviceAct("hı anladım kolay gelsin sana")).toBe(false);
    expect(isTurkishAdviceAct("yoğunken yazman da ayrı değerli, tamamdır")).toBe(false);
  });

  it("does not classify a plain better-state prediction as advice", () => {
    expect(isTurkishAdviceAct("yarın hava daha iyi olur")).toBe(false);
  });
});
