import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";

async function understand(message: string) {
  return understandTurkishMessage(message);
}

describe("explicit second-person canonical target completion", () => {
  it("reported: senle reference grounds an otherwise unknown target to Kaira", async () => {
    const result = await understand("senle uğraşmak hoşuma gidiyor");
    expect(result.entityResolution.references.some((ref) => ref.role === "second_person" && ref.resolvedId === "kaira")).toBe(true);
    expect(result.interpretation.target).toBe("kaira");
  });

  it("neighbor-1: seninle reference grounds to Kaira", async () => {
    const result = await understand("seninle konuşmak güzel");
    expect(result.interpretation.target).toBe("kaira");
  });

  it("neighbor-2: sende reference grounds to Kaira", async () => {
    const result = await understand("sende durumlar nasıl");
    expect(result.interpretation.target).toBe("kaira");
  });

  it("counterexample-1: explicit third-party narration remains third-party", async () => {
    const result = await understand("Mert iş arkadaşına bağırdı");
    expect(result.interpretation.target).toBe("third_party");
  });

  it("counterexample-2: no participant reference does not manufacture a Kaira target", async () => {
    const result = await understand("bugün hava güzel");
    expect(result.interpretation.target).not.toBe("kaira");
  });
});
