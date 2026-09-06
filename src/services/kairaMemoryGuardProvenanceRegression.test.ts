import { describe, expect, it } from "vitest";
import { enforceKairaAutobiographicalResponse } from "./kairaAutobiographicalResponseGuard";
import type { KairaAutobiographicalRecallRuntimeResult } from "./kairaAutobiographicalRecallRuntime";

const missingRuntime: KairaAutobiographicalRecallRuntimeResult = {
  status: "missing",
  recall: {
    query: {
      surface: "Mert yarın ne yapacaktı?",
      scope: "autobiographical_memory",
      retrievalMode: "targeted",
      confidence: 0.95,
    },
    selfFacts: [],
    memories: [],
    withheldSensitiveCount: 0,
  },
  instruction: "",
};

const protectedWorldGrounding = {
  source: "world_memory" as const,
  grounded: true,
  protected: true,
  reason: "grounded_world_response_satisfied",
};

describe("memory guard provenance — A3 regression", () => {
  it("does not let a missing self-memory fallback erase a grounded world-memory reply", () => {
    const worldReply = "Bana daha önce Mert'in yarın istifa edeceğini söylemiştin.";
    const result = enforceKairaAutobiographicalResponse(worldReply, missingRuntime, {
      priorGrounding: protectedWorldGrounding,
    });

    expect(result.reply).toBe(worldReply);
    expect(result.changed).toBe(false);
    expect(result.reason).toBe("self_memory_fallback_suppressed_by_world_grounding");
  });

  it("still emits the normal self-memory fallback when no prior grounding protects the reply", () => {
    const candidate = "Sanırım Mert yarın işe gidecek.";
    const result = enforceKairaAutobiographicalResponse(candidate, missingRuntime);

    expect(result.reply).toBe("Buna dair net bir anım yok.");
    expect(result.changed).toBe(true);
    expect(result.reason).toBe("self_memory_missing_fallback");
  });

  it("keeps resolved self-fact authority even when a prior world reply is protected", () => {
    const resolved: KairaAutobiographicalRecallRuntimeResult = {
      status: "resolved",
      recall: {
        query: {
          surface: "adın ne?",
          scope: "self_fact",
          factKey: "identity.name",
          retrievalMode: "targeted",
          confidence: 0.99,
        },
        selfFacts: [
          {
            fact: {
              id: "self-name",
              domain: "biography",
              key: "identity.name",
              value: "Kaira",
              canonical: true,
              confidence: 1,
              source: "identity_seed",
            },
            score: 1,
            reasons: ["canonical_fact_key_match"],
          },
        ],
        memories: [],
        withheldSensitiveCount: 0,
      },
      instruction: "",
    };

    const result = enforceKairaAutobiographicalResponse("Adım başka bir şey.", resolved, {
      priorGrounding: protectedWorldGrounding,
    });

    expect(result.reply).toBe("Buna dair net kaydım: Kaira.");
    expect(result.reason).toBe("self_memory_resolved_fact_conformance");
  });
});
