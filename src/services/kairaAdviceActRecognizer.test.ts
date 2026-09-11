import { describe, expect, it } from "vitest";
import { isTurkishAdviceAct } from "./kairaAdviceActRecognizer";

describe("isTurkishAdviceAct", () => {
  it("detects nominalized 'daha iyi olur' advice", () => {
    expect(isTurkishAdviceAct("aranızda kalması daha iyi olur")).toBe(true);
  });

  it("does not classify a plain better-state prediction as advice", () => {
    expect(isTurkishAdviceAct("yarın hava daha iyi olur")).toBe(false);
  });
});
