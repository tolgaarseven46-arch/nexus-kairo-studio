import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";

describe("remaining deterministic Turkish language families", () => {
  it("keeps contextual yeter sufficiency separate from a stop request", async () => {
    const sufficiency = await understandTurkishMessage("bilmiyorsan bilmiyorum de yeter");
    const explicitStop = await understandTurkishMessage("yeter");

    expect(sufficiency.interpretation.stopRequest).toBe(false);
    expect(sufficiency.event.stopTalking).toBe(false);
    expect(explicitStop.interpretation.stopRequest).toBe(true);
    expect(explicitStop.event.stopTalking).toBe(true);
  });

  it("keeps preference seviyorum separate from Kaira-directed affection", async () => {
    const preference = await understandTurkishMessage("kahveyi seviyorum");
    const directed = await understandTurkishMessage("seni seviyorum");

    expect(preference.interpretation.primaryIntent).toBe("smalltalk");
    expect(preference.interpretation.valence).toBe("neutral");
    expect(preference.interpretation.compliment).toBe(0);

    expect(directed.interpretation.primaryIntent).toBe("compliment");
    expect(directed.interpretation.valence).toBe("positive");
    expect(directed.interpretation.compliment).toBeGreaterThan(0);
    expect(directed.interpretation.target).toBe("kaira");
  });

  it.each([
    "sen dün ne yaptın",
    "gece neredeydin",
    "bugün kimlerle konuştun",
    "şimdi neredesin",
    "birazdan ne yapacaksın",
  ])("keeps inflected interrogative as information_request: %s", async (message) => {
    const result = await understandTurkishMessage(message);
    expect(result.interpretation.primaryIntent).toBe("information_request");
  });

  it("keeps reported third-party harm out of the active Kaira-user dyad", async () => {
    const reported = await understandTurkishMessage("iş arkadaşına salak dedi");
    const directed = await understandTurkishMessage("sana salak dedim");

    expect(reported.interpretation.target).toBe("third_party");
    expect(reported.event.relationshipScope).toBe("third_party");

    expect(directed.interpretation.target).toBe("kaira");
    expect(directed.event.relationshipScope).toBe("kaira_user");
  });

  it("protects nearby non-question lexical counterexamples", async () => {
    for (const message of ["ne güzel hava", "kimya çalışıyorum", "neredeyse bitti"]) {
      const result = await understandTurkishMessage(message);
      expect(result.interpretation.primaryIntent).toBe("smalltalk");
    }
  });
});
