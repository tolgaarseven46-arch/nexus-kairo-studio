import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";

describe("Turkish polar-question particle intent", () => {
  it("reported: punctuation-free misin question is not smalltalk", async () => {
    const result = await understandTurkishMessage("sen sessizliği sever misin");
    expect(result.interpretation.primaryIntent).toBe("information_request");
    expect(result.interpretation.target).toBe("kaira");
  });

  it("neighbor-1: standalone mı marks a punctuation-free polar question", async () => {
    const result = await understandTurkishMessage("ailen var mı");
    expect(result.interpretation.primaryIntent).toBe("information_request");
  });

  it("neighbor-2: past-experience polar question is not smalltalk", async () => {
    const result = await understandTurkishMessage("oraya gittin mi hiç");
    expect(result.interpretation.primaryIntent).toBe("information_request");
  });

  it("neighbor-3: first-person inflected question particle is recognized", async () => {
    const result = await understandTurkishMessage("ben de geleyim mi");
    expect(result.interpretation.primaryIntent).toBe("information_request");
  });

  it("counterexample-1: mi inside a normal word is not a question signal", async () => {
    const result = await understandTurkishMessage("mimik yapmak bazen komik");
    expect(result.interpretation.primaryIntent).toBe("smalltalk");
  });

  it("counterexample-2: another lexical mi prefix remains smalltalk", async () => {
    const result = await understandTurkishMessage("mimar olmak zor");
    expect(result.interpretation.primaryIntent).toBe("smalltalk");
  });
});
