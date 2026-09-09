import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";

async function target(message: string) {
  return understandTurkishMessage(message);
}

describe("third-party narrated target neighbor proof regression", () => {
  it("reported: iş arkadaşına insult remains third-party scoped", async () => {
    const result = await target("iş arkadaşına salak dedi");
    expect(result.interpretation.target).toBe("third_party");
    expect(result.event.relationshipScope).toBe("third_party");
  });

  it("neighbor-1: friend dative narration remains third-party scoped", async () => {
    const result = await target("arkadaşıma bağırdı");
    expect(result.interpretation.target).toBe("third_party");
  });

  it("neighbor-2: sibling dative narration remains third-party scoped", async () => {
    const result = await target("kardeşime hakaret etti");
    expect(result.interpretation.target).toBe("third_party");
  });

  it("neighbor-3: boss dative narration remains third-party scoped", async () => {
    const result = await target("patronuna küfür etmiş");
    expect(result.interpretation.target).toBe("third_party");
  });

  it("counterexample: explicit second-person insult remains Kaira-user scoped", async () => {
    const result = await target("sana salak dedim");
    expect(result.interpretation.target).toBe("kaira");
    expect(result.event.relationshipScope).toBe("kaira_user");
  });

  it("counterexample: comparison framing does not steal direct Kaira target", async () => {
    const result = await target("arkadaşına göre sen salaksın");
    expect(result.interpretation.target).toBe("kaira");
  });
});
