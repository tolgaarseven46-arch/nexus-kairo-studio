import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { isSemanticEvent } from "./semanticEventAuthority";
import {
  interpretationFromLegacyEvent,
  interpretationFromRegexFloor,
  projectLegacySemanticEvent,
} from "./semanticInterpretationLegacyProjection";
import { isSemanticInterpretation } from "./semanticInterpretationSchema";

describe("SemanticEvent <-> SemanticInterpretation legacy shim", () => {
  it("builds a valid interpretation from the regex floor", () => {
    const i = interpretationFromRegexFloor("naber kaira");
    expect(isSemanticInterpretation(i)).toBe(true);
    expect(i.evidence.some((e) => e.source === "regex")).toBe(true);
    expect(i.uncertainty.overall).toBeGreaterThan(0.3);
  });

  it("round-trips a legacy event to interpretation and back to a valid SemanticEvent", () => {
    for (const msg of ["naber", "seni seviyorum", "aptalsın", "orospu", "gel yanıma", "özür dilerim", "sus artık"]) {
      const legacy = interpretSemanticEvent(msg);
      const interp = interpretationFromLegacyEvent(legacy, msg);
      expect(isSemanticInterpretation(interp)).toBe(true);
      const projected = projectLegacySemanticEvent(interp, msg);
      expect(isSemanticEvent(projected)).toBe(true);
    }
  });

  it("never drops a regex-detected hard signal on the way down (safety floor)", () => {
    const msg = "orospu"; // RED_LINE_RE in the regex engine
    const legacy = interpretSemanticEvent(msg);
    expect(legacy.redLine).toBe(true);
    // even a sanitized interpretation must not erase the floor
    const sanitized = interpretationFromRegexFloor(msg);
    sanitized.severity.disrespect = 0;
    sanitized.primaryIntent = "smalltalk";
    const projected = projectLegacySemanticEvent(sanitized, msg);
    expect(projected.redLine).toBe(true);
    expect(projected.insult).toBe(true);
  });

  it("carries the severity VECTOR (not a collapsed scalar) for distinct hostile phrasings", () => {
    const insult = interpretationFromRegexFloor("gerizekalı");
    const coercion = interpretationFromRegexFloor("dediğimi yap");
    expect(insult.severity.disrespect).toBeGreaterThan(insult.severity.coercion);
    expect(coercion.severity.coercion).toBeGreaterThan(coercion.severity.disrespect);
  });
});
