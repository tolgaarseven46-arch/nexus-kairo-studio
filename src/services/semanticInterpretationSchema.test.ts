import { describe, expect, it } from "vitest";
import {
  isSemanticInterpretation,
  normalizeSemanticInterpretation,
} from "./semanticInterpretationSchema";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

describe("SemanticInterpretation@2 schema", () => {
  it("normalizes an empty value into a valid, conservative, versioned interpretation", () => {
    const i = normalizeSemanticInterpretation({}, "selam");
    expect(i.schemaVersion).toBe(SEMANTIC_INTERPRETATION_SCHEMA_VERSION);
    expect(isSemanticInterpretation(i)).toBe(true);
    expect(i.primaryIntent).toBe("other");
    expect(i.target).toBe("unknown");
    expect(i.valence).toBe("neutral");
    expect(i.severity).toEqual({ disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 });
  });

  it("preserves uncertainty and never reports full confidence for a missing block", () => {
    const i = normalizeSemanticInterpretation({ raw: "x" }, "x");
    expect(i.uncertainty.overall).toBeGreaterThan(0);
    expect(i.uncertainty.overall).toBeLessThanOrEqual(1);
  });

  it("keeps an explicit uncertainty block and clamps its fields", () => {
    const i = normalizeSemanticInterpretation({
      raw: "x",
      uncertainty: { overall: 5, intent: -1, target: 0.3, severity: 0.2, ambiguousReadings: ["a", 2, "b"] },
    });
    expect(i.uncertainty.overall).toBe(1);
    expect(i.uncertainty.intent).toBe(0);
    expect(i.uncertainty.ambiguousReadings).toEqual(["a", "b"]);
  });

  it("clamps severity vector components to 0..1 and dedupes social acts", () => {
    const i = normalizeSemanticInterpretation({
      raw: "x",
      severity: { disrespect: 2, coercion: -3, aggression: 0.5 },
      secondarySocialActs: ["insult", "insult", "banter", "not-a-real-act"],
    });
    expect(i.severity.disrespect).toBe(1);
    expect(i.severity.coercion).toBe(0);
    expect(i.severity.aggression).toBe(0.5);
    expect(i.secondarySocialActs).toEqual(["insult", "banter"]);
  });

  it("rejects malformed values via the type guard", () => {
    expect(isSemanticInterpretation(null)).toBe(false);
    expect(isSemanticInterpretation({ schemaVersion: "wrong" })).toBe(false);
    expect(isSemanticInterpretation({ ...normalizeSemanticInterpretation({}), primaryIntent: "nope" })).toBe(false);
  });
});
