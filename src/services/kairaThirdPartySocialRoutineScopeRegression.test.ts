import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";

function incomingWithRoutine(
  message: string,
  target: "kaira" | "third_party",
  socialRoutine: "how_are_you" | "what_doing",
) {
  const base = interpretationFromRegexFloor(message);
  return {
    ...base,
    target,
    discourseFacets: {
      ...base.discourseFacets,
      socialRoutine,
    },
  };
}

describe("third-party reciprocal social-routine scope regression", () => {
  it("removes a Kaira-reciprocal what_doing overread from a third-party question", async () => {
    const message = "ee selami napıyor";
    const result = await understandTurkishMessage(message, {
      incomingSemanticInterpretation: incomingWithRoutine(
        message,
        "third_party",
        "what_doing",
      ),
      context: { userName: "Mert", characterName: "KAIRO" },
    });

    expect(result.interpretation.target).toBe("third_party");
    expect(result.interpretation.discourseFacets.socialRoutine).toBe("none");
    expect(result.event.target).toBe("third_party");
    expect(result.event.socialRoutine).toBe("none");
    expect(
      result.interpretation.evidence.some((entry) =>
        entry.cues.includes("reciprocal_social_routine_requires_kaira_target"),
      ),
    ).toBe(true);
  });

  it("preserves a genuine Kaira-directed what_doing routine", async () => {
    const message = "sen napıyon";
    const result = await understandTurkishMessage(message, {
      incomingSemanticInterpretation: incomingWithRoutine(
        message,
        "kaira",
        "what_doing",
      ),
      context: { userName: "Mert", characterName: "KAIRO" },
    });

    expect(result.interpretation.target).toBe("kaira");
    expect(result.interpretation.discourseFacets.socialRoutine).toBe("what_doing");
    expect(result.event.socialRoutine).toBe("what_doing");
  });

  it("also removes a third-party how_are_you overread without touching raw text", async () => {
    const message = "ece nasıl";
    const result = await understandTurkishMessage(message, {
      incomingSemanticInterpretation: incomingWithRoutine(
        message,
        "third_party",
        "how_are_you",
      ),
      context: { userName: "Mert", characterName: "KAIRO" },
    });

    expect(result.interpretation.discourseFacets.socialRoutine).toBe("none");
    expect(result.event.socialRoutine).toBe("none");
  });
});
