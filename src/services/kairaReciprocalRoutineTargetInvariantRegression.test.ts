import { describe, expect, it } from "vitest";
import { understandTurkishMessage } from "./languageUnderstandingService";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import type { SemanticTarget } from "../types/semanticInterpretation";

function incomingWithRoutine(
  message: string,
  target: SemanticTarget,
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

describe("reciprocal social-routine target invariant", () => {
  for (const socialRoutine of ["how_are_you", "what_doing"] as const) {
    it(`${socialRoutine} survives only when canonical target is Kaira`, async () => {
      for (const target of ["kaira", "third_party", "self", "event", "unknown"] as const) {
        const result = await understandTurkishMessage("test", {
          incomingSemanticInterpretation: incomingWithRoutine("test", target, socialRoutine),
          context: { userName: "Mert", characterName: "KAIRO" },
        });

        expect(result.interpretation.discourseFacets.socialRoutine).toBe(
          target === "kaira" ? socialRoutine : "none",
        );
        expect(result.event.socialRoutine).toBe(
          target === "kaira" ? socialRoutine : "none",
        );
      }
    });
  }

  it("closes the measured target=unknown state-share neighbor without reparsing raw text", async () => {
    const message = "iyi beya çay içiyom";
    const result = await understandTurkishMessage(message, {
      incomingSemanticInterpretation: incomingWithRoutine(message, "unknown", "what_doing"),
      context: { userName: "Mert", characterName: "KAIRO" },
    });

    expect(result.interpretation.target).toBe("unknown");
    expect(result.interpretation.discourseFacets.socialRoutine).toBe("none");
    expect(
      result.interpretation.evidence.some((entry) =>
        entry.cues.includes("reciprocal_social_routine_requires_kaira_target"),
      ),
    ).toBe(true);
  });
});
