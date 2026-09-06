import { describe, expect, it } from "vitest";
import { semanticNegativePattern } from "./kdmRelationshipReducerBridge";

const interpretation = (overrides: Record<string, unknown> = {}) => ({
  primaryIntent: "general_chat",
  secondarySocialActs: [],
  severity: {
    disrespect: 0,
    coercion: 0,
    aggression: 0,
    manipulation: 0,
    privacy: 0,
  },
  jokingConfidence: 0,
  sincerityConfidence: 0.8,
  uncertainty: { overall: 0 },
  ...overrides,
}) as any;

describe("semanticNegativePattern — canonical context coverage", () => {
  it("does not persist a low-level disrespect pattern when joking context makes the harm non-credible", () => {
    const interp = interpretation({
      severity: {
        disrespect: 0.2,
        coercion: 0,
        aggression: 0,
        manipulation: 0,
        privacy: 0,
      },
      jokingConfidence: 0.8,
      sincerityConfidence: 0.2,
    });

    expect(semanticNegativePattern(interp)).toBeNull();
  });

  it("still persists the same disrespect pattern when canonical context says it is sincere", () => {
    const interp = interpretation({
      severity: {
        disrespect: 0.2,
        coercion: 0,
        aggression: 0,
        manipulation: 0,
        privacy: 0,
      },
      jokingConfidence: 0,
      sincerityConfidence: 0.9,
    });

    expect(semanticNegativePattern(interp)).toBe("hakaret");
  });

  it("keeps explicit canonical insult acts authoritative even when joking confidence is high", () => {
    const interp = interpretation({
      primaryIntent: "insult",
      severity: {
        disrespect: 0.2,
        coercion: 0,
        aggression: 0,
        manipulation: 0,
        privacy: 0,
      },
      jokingConfidence: 0.8,
      sincerityConfidence: 0.2,
    });

    expect(semanticNegativePattern(interp)).toBe("hakaret");
  });
});
