import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";

async function semantic(message: string) {
  return understandTurkishMessage(message);
}

describe("semantic negation + stop neighbor proof regression", () => {
  it("reported: negated apology does not become repair evidence", async () => {
    const result = await semantic("ama özür dilemedim");
    expect(result.interpretation.apology).toBe(false);
    expect(result.interpretation.primaryIntent).not.toBe("apology");
  });

  it("neighbor-1: progressive negated apology remains non-apology", async () => {
    const result = await semantic("özür dilemiyorum");
    expect(result.interpretation.apology).toBe(false);
  });

  it("neighbor-2: negated advice mention does not request advice", async () => {
    const result = await semantic("tavsiye istemiyorum");
    expect(result.interpretation.discourseFacets.adviceRequested).toBe(false);
  });

  it("neighbor-3: explicit stop paraphrase becomes a transient stop request", async () => {
    const result = await semantic("konuşmayı bırak");
    expect(result.interpretation.stopRequest).toBe(true);
    expect(result.event.stopTalking).toBe(true);
  });

  it("reported stop-scope: predicative yeter does not end the conversation", async () => {
    const result = await semantic("bilmiyorsan bilmiyorum de yeter");
    expect(result.interpretation.stopRequest).toBe(false);
    expect(result.event.stopTalking).toBe(false);
  });

  it("stop-scope neighbor-1: sufficiency statement is not a stop request", async () => {
    const result = await semantic("bu bilgi yeter");
    expect(result.interpretation.stopRequest).toBe(false);
  });

  it("stop-scope neighbor-2: this-much-is-enough wording is not a stop request", async () => {
    const result = await semantic("şimdilik bu kadarı yeter");
    expect(result.interpretation.stopRequest).toBe(false);
  });

  it("counterexample: affirmative apology remains affirmative", async () => {
    const result = await semantic("özür dilerim");
    expect(result.interpretation.apology).toBe(true);
  });

  it("counterexample: negated stop wording does not manufacture stop", async () => {
    const result = await semantic("susma");
    expect(result.interpretation.stopRequest).toBe(false);
  });

  it("stop-scope counterexample-1: standalone yeter remains a stop request", async () => {
    const result = await semantic("yeter");
    expect(result.interpretation.stopRequest).toBe(true);
    expect(result.event.stopTalking).toBe(true);
  });

  it("stop-scope counterexample-2: explicit yeter artık remains a stop request", async () => {
    const result = await semantic("tamam yeter artık");
    expect(result.interpretation.stopRequest).toBe(true);
    expect(result.event.stopTalking).toBe(true);
  });
});
