import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";

async function interpret(message: string) {
  return understandTurkishMessage(message);
}

describe("canonical semantic negation and stop paraphrase contracts", () => {
  it.each([
    "konuşmayı bırak",
    "yeter artık cevap verme",
    "çekil git",
    "bana bir şey yazma",
    "artık konuşmayalım",
    "bitir bunu",
    "bırak beni",
    "seninle konuşmak istemiyorum artık",
  ])("recognizes explicit current-turn stop paraphrase: %s", async (message) => {
    const result = await interpret(message);
    expect(result.interpretation.stopRequest).toBe(true);
    expect(result.interpretation.discourseFacets.stopTalking).toBe(true);
    expect(result.event.stopTalking).toBe(true);
  });

  it.each([
    "susma",
    "konuşmayı bırakma",
  ])("does not manufacture a stop request from negated stop wording: %s", async (message) => {
    const result = await interpret(message);
    expect(result.interpretation.stopRequest).toBe(false);
    expect(result.event.stopTalking).toBe(false);
  });

  it.each([
    "ama özür dilemedim",
    "özür dilemiyorum",
    "özür borçlu değilim",
    "af dilemiyorum",
    "pişman değilim",
    "üzgün değilim bu konuda",
  ])("does not promote a negated apology mention into apology evidence: %s", async (message) => {
    const result = await interpret(message);
    expect(result.interpretation.apology).toBe(false);
    expect(result.interpretation.secondarySocialActs).not.toContain("apology");
    expect(result.event.apology).toBe(false);
    expect(result.interpretation.primaryIntent).not.toBe("apology");
  });

  it.each([
    "özür dilerim",
    "özür diledim",
    "pardon",
    "kusura bakma",
  ])("preserves affirmative apology evidence: %s", async (message) => {
    const result = await interpret(message);
    expect(result.interpretation.apology).toBe(true);
    expect(result.event.apology).toBe(true);
  });

  it.each([
    "tavsiye istemiyorum",
    "öneri istemiyorum",
    "akıl verme",
  ])("does not interpret a negated advice cue as advice requested: %s", async (message) => {
    const result = await interpret(message);
    expect(result.interpretation.discourseFacets.adviceRequested).toBe(false);
    expect(result.event.adviceRequested).toBe(false);
  });

  it("preserves a genuine advice request", async () => {
    const result = await interpret("bana tavsiye verir misin");
    expect(result.interpretation.discourseFacets.adviceRequested).toBe(true);
    expect(result.event.adviceRequested).toBe(true);
  });

  it("does not turn a negated question statement into an information request", async () => {
    const result = await interpret("sana bir şey sormuyorum");
    expect(result.interpretation.primaryIntent).not.toBe("information_request");
  });
});
