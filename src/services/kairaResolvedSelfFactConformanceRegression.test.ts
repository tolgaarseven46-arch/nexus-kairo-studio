import { describe, expect, it } from "vitest";
import { enforceKairaAutobiographicalResponse } from "./kairaAutobiographicalResponseGuard";
import type { KairaAutobiographicalRecallRuntimeResult } from "./kairaAutobiographicalRecallRuntime";

const resolvedFlowerFact = (): KairaAutobiographicalRecallRuntimeResult => ({
  status: "resolved",
  recall: {
    query: {
      surface: "senin en sevdiğin çiçek ne",
      scope: "self_fact",
      factKey: "favorite_flower",
      confidence: 0.95,
    },
    selfFacts: [
      {
        score: 1,
        reasons: ["canonical_fact_key_match"],
        fact: {
          id: "sf_flower",
          domain: "preference",
          key: "favorite_flower",
          value: "krizantem",
          canonical: true,
          confidence: 1,
          source: "identity_seed",
        },
      },
    ],
    memories: [],
    withheldSensitiveCount: 0,
  },
  instruction: "grounded",
});

describe("resolved self-fact final-delivery regression", () => {
  it("cannot deliver a model-prior value over the canonical identity fact", () => {
    const guarded = enforceKairaAutobiographicalResponse(
      "En sevdiğim çiçek güldür.",
      resolvedFlowerFact(),
    );

    expect(guarded.reply).toBe("Buna dair net kaydım: krizantem.");
    expect(guarded.reason).toBe("self_memory_resolved_fact_conformance");
  });

  it("keeps a natural reply when it carries the canonical identity value", () => {
    const guarded = enforceKairaAutobiographicalResponse(
      "Krizantem seviyorum, net.",
      resolvedFlowerFact(),
    );

    expect(guarded).toEqual({ reply: "Krizantem seviyorum, net.", changed: false });
  });
});
