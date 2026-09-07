import { describe, expect, it } from "vitest";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import {
  dyadicNormKeyForInterpretation,
  emptyDyadicSocialNorm,
  observeDyadicNorm,
  readDyadicNorm,
} from "./dyadicSocialNorm";

function observeMany(
  subjectId: string,
  impacts: Array<"benign" | "harmful" | "mixed" | "unknown">,
) {
  return impacts.reduce(
    (profile, impact, index) =>
      observeDyadicNorm(profile, {
        key: "insult",
        impact,
        observedAt: `2026-09-0${Math.min(9, index + 1)}T12:00:00.000Z`,
      }),
    emptyDyadicSocialNorm(subjectId),
  );
}

describe("DyadicSocialNorm v0", () => {
  it("never establishes permission from one benign observation", () => {
    const profile = observeMany("alice", ["benign"]);
    const reading = readDyadicNorm(profile, "insult");

    expect(reading.observedCount).toBe(1);
    expect(reading.established).toBe(false);
    expect(reading.permissiveCandidate).toBe(false);
  });

  it("can learn a repeated low-harm dyadic pattern without making it global", () => {
    const alice = observeMany("alice", ["benign", "benign", "benign", "benign"]);
    const bob = emptyDyadicSocialNorm("bob");

    const aliceReading = readDyadicNorm(alice, "insult");
    const bobReading = readDyadicNorm(bob, "insult");

    expect(aliceReading.established).toBe(true);
    expect(aliceReading.permissiveCandidate).toBe(true);
    expect(aliceReading.expectedness).toBeGreaterThan(0.5);
    expect(bobReading.expectedness).toBe(0);
    expect(bobReading.permissiveCandidate).toBe(false);
  });

  it("keeps frequent harmful behavior familiar but non-permissive", () => {
    const profile = observeMany("alice", [
      "harmful",
      "harmful",
      "harmful",
      "harmful",
      "harmful",
    ]);
    const reading = readDyadicNorm(profile, "insult");

    expect(reading.established).toBe(true);
    expect(reading.expectedness).toBeGreaterThan(0.5);
    expect(reading.harmfulEvidence).toBe(1);
    expect(reading.permissiveCandidate).toBe(false);
  });

  it("maps only canonical primary/secondary semantics and never raw text", () => {
    const compliment = {
      primaryIntent: "compliment",
      secondarySocialActs: [],
    } as SemanticInterpretation;
    const coercion = {
      primaryIntent: "command",
      secondarySocialActs: ["coercion"],
    } as SemanticInterpretation;
    const neutral = {
      primaryIntent: "question",
      secondarySocialActs: [],
    } as SemanticInterpretation;

    expect(dyadicNormKeyForInterpretation(compliment)).toBe("compliment");
    expect(dyadicNormKeyForInterpretation(coercion)).toBe("coercion");
    expect(dyadicNormKeyForInterpretation(neutral)).toBeNull();
  });
});
