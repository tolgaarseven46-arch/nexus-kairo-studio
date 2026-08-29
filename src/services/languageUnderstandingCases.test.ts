import { describe, expect, it } from "vitest";
import { isSemanticEvent } from "./semanticEventAuthority";

/**
 * Acceptance cases for the upcoming live semantic provider.
 * These are not regex tests. They define what the language-understanding layer
 * must mean before KDM/appraisal is allowed to react.
 */
describe("language understanding acceptance contract", () => {
  it("requires a complete semantic event before downstream KDM can trust it", () => {
    expect(
      isSemanticEvent({
        raw: "Kaira sen salaksın",
        normalized: "kaira sen salaksın",
        intent: "insult",
        valence: "negative",
        target: "kaira",
        relationalAct: "none",
        relationalIntensity: 0,
        severity: 0.85,
        insult: true,
        redLine: false,
        disrespect: 0.9,
        coercion: 0,
        manipulation: 0,
        privacyViolation: 0,
        apology: false,
        repairAttempt: false,
        stopQuestions: false,
        stopTalking: false,
        frustration: 0.3,
        emotionalLoad: 0,
        affection: 0,
        support: 0,
        compliment: 0,
      }),
    ).toBe(true);
  });

  it("rejects partial model output instead of letting KDM guess missing fields", () => {
    expect(
      isSemanticEvent({
        raw: "Mert bana salak dedi",
        intent: "insult",
        target: "third_party",
      }),
    ).toBe(false);
  });
});

export const LANGUAGE_UNDERSTANDING_ACCEPTANCE_CASES = [
  {
    message: "Kaira sen salaksın",
    expected: { insult: true, target: "kaira", valence: "negative" },
  },
  {
    message: "Mert bana salak dedi",
    expected: { insult: true, target: "third_party" },
  },
  {
    message: "mal aldım dükkandan",
    expected: { insult: false, target: "unknown" },
  },
  {
    message: "salaksın ama seviyorum seni 😂",
    expected: { insult: true, target: "kaira", affectionAtLeast: 0.1 },
  },
] as const;
