import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";

async function understand(message: string) {
  return understandTurkishMessage(message);
}

describe("reported third-party target grounding", () => {
  it.each([
    "iş arkadaşına salak dedi",
    "arkadaşıma bağırdı",
    "kardeşime hakaret etti",
    "patronuna küfür etmiş",
    "eşine kötü davranıyordu",
  ])("grounds narrated dative social-role target as third_party: %s", async (message) => {
    const result = await understand(message);
    expect(result.interpretation.target).toBe("third_party");
    expect(result.event.target).toBe("third_party");
    expect(result.event.relationshipScope).toBe("third_party");
  });

  it("prevents the reported insult from mutating the active dyad scope", async () => {
    const result = await understand("iş arkadaşına salak dedi");
    expect(result.event.relationshipScope).toBe("third_party");
  });

  it.each([
    "sen salaksın",
    "sana salak dedim",
  ])("preserves explicit Kaira-directed target evidence: %s", async (message) => {
    const result = await understand(message);
    expect(result.interpretation.target).toBe("kaira");
    expect(result.event.relationshipScope).toBe("kaira_user");
  });

  it("does not let a comparative third-party phrase steal a direct Kaira insult", async () => {
    const result = await understand("arkadaşına göre sen salaksın");
    expect(result.interpretation.target).toBe("kaira");
    expect(result.event.relationshipScope).toBe("kaira_user");
  });
});
