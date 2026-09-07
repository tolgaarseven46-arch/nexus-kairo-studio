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
    it(`${socialRoutine} cannot survive with an explicit non-Kaira target`, async () => {
      for (const target of ["third_party", "self", "event"] as const) {
        const result = await understandTurkishMessage("test", {
          incomingSemanticInterpretation: incomingWithRoutine("test", target, socialRoutine),
          context: { userName: "Mert", characterName: "KAIRO" },
        });

        expect(result.interpretation.target).toBe(target);
        expect(result.interpretation.discourseFacets.socialRoutine).toBe("none");
        expect(result.event.socialRoutine).toBe("none");
      }
    });

    it(`${socialRoutine} resolves an otherwise unknown implicit dyadic addressee to Kaira`, async () => {
      const result = await understandTurkishMessage("naber şimdi", {
        incomingSemanticInterpretation: incomingWithRoutine("naber şimdi", "unknown", socialRoutine),
        context: { userName: "Mert", characterName: "KAIRO" },
      });

      expect(result.interpretation.target).toBe("kaira");
      expect(result.interpretation.discourseFacets.socialRoutine).toBe(socialRoutine);
      expect(result.event.target).toBe("kaira");
      expect(result.event.socialRoutine).toBe(socialRoutine);
      expect(
        result.interpretation.evidence.some((entry) =>
          entry.cues.includes("implicit_reciprocal_routine_resolves_kaira_target"),
        ),
      ).toBe(true);
    });
  }

  it("preserves a genuine explicit Kaira-directed reciprocal routine", async () => {
    const result = await understandTurkishMessage("sen napıyon", {
      incomingSemanticInterpretation: incomingWithRoutine("sen napıyon", "kaira", "what_doing"),
      context: { userName: "Mert", characterName: "KAIRO" },
    });

    expect(result.interpretation.target).toBe("kaira");
    expect(result.interpretation.discourseFacets.socialRoutine).toBe("what_doing");
  });

  it("closes the measured target=unknown current-user state-share neighbor without reparsing raw text", async () => {
    const message = "iyi beya çay içiyom";
    const incoming = incomingWithRoutine(message, "unknown", "what_doing");
    const result = await understandTurkishMessage(message, {
      incomingSemanticInterpretation: {
        ...incoming,
        worldMemory: {
          claims: [
            {
              subjectId: "current_user",
              attributeKey: "current_activity",
              value: "drinking_tea",
              confidence: 0.94,
            },
          ],
          query: null,
        },
      },
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

  it("keeps the final canonical invariant: any surviving reciprocal routine targets Kaira", async () => {
    for (const target of ["kaira", "third_party", "self", "event", "unknown"] as const) {
      const result = await understandTurkishMessage("naber şimdi", {
        incomingSemanticInterpretation: incomingWithRoutine("naber şimdi", target, "how_are_you"),
        context: { userName: "Mert", characterName: "KAIRO" },
      });
      if (result.interpretation.discourseFacets.socialRoutine !== "none") {
        expect(result.interpretation.target).toBe("kaira");
      }
    }
  });
});
