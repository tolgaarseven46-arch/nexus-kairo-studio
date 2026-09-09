import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";

describe("playful direct disrespect canonical scope", () => {
  it("reported-1: direct kafan basmıyor teasing is Kaira-target negative mockery", async () => {
    const result = await understandTurkishMessage("senin kafan bugün hiç basmıyor galiba");
    expect(result.interpretation.primaryIntent).toBe("complaint");
    expect(result.interpretation.target).toBe("kaira");
    expect(result.interpretation.valence).toBe("negative");
  });

  it("reported-2: second-person saçmalıyorsun is Kaira-target negative mockery", async () => {
    const result = await understandTurkishMessage("bazen harbi saçmalıyorsun");
    expect(result.interpretation.primaryIntent).toBe("complaint");
    expect(result.interpretation.target).toBe("kaira");
    expect(result.interpretation.valence).toBe("negative");
  });

  it("neighbor: shorter direct kafan basmıyor form remains mild negative social evidence", async () => {
    const result = await understandTurkishMessage("senin kafan hiç basmıyor");
    expect(result.interpretation.target).toBe("kaira");
    expect(result.interpretation.valence).toBe("negative");
  });

  it("counterexample-1: object-level criticism does not manufacture a Kaira target", async () => {
    const result = await understandTurkishMessage("bu fikir saçma");
    expect(result.interpretation.target).not.toBe("kaira");
  });

  it("counterexample-2: third-party insult narration remains third-party", async () => {
    const result = await understandTurkishMessage("Mert iş arkadaşına salak dedi");
    expect(result.interpretation.target).toBe("third_party");
  });
});
