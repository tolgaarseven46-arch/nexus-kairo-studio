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

describe("semanticNegativePattern — contextual relationship regression", () => {
  it("does not persist low-level disrespect when canonical joking context makes harm non-credible", () => {
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

  it("persists the same severity when canonical context says the harm is sincere", () => {
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

  it("keeps explicit canonical insult acts authoritative", () => {
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
