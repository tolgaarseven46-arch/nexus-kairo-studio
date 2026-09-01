import { describe, expect, it, vi } from "vitest";
import { canonicalIdentityFromSeed } from "./kairaCanonicalIdentity";
import { buildKairaIdentityTestFixture } from "./kairaIdentityContracts";
import { resolveKairaAutobiographicalRecallRuntime } from "./kairaAutobiographicalRecallRuntime";

describe("Kaira autobiographical recall runtime seam", () => {
  it("does not touch persistence when self-memory was not requested", async () => {
    const loadIdentity = vi.fn();
    const result = await resolveKairaAutobiographicalRecallRuntime(
      { instance: { instanceId: "kaira_01", instanceType: "individual" } },
      { loadIdentity },
    );
    expect(result.status).toBe("not_requested");
    expect(loadIdentity).not.toHaveBeenCalled();
  });

  it("does not touch persistence for low-confidence queries", async () => {
    const loadIdentity = vi.fn();
    const result = await resolveKairaAutobiographicalRecallRuntime(
      {
        instance: { instanceId: "kaira_01", instanceType: "individual" },
        query: { surface: "belirsiz", scope: "any", confidence: 0.4 },
      },
      { loadIdentity },
    );
    expect(result.status).toBe("low_confidence");
    expect(loadIdentity).not.toHaveBeenCalled();
  });

  it("never recalls persistent autobiography for Welcome Kaira", async () => {
    const loadIdentity = vi.fn();
    const result = await resolveKairaAutobiographicalRecallRuntime(
      {
        instance: { instanceId: "welcome_demo", instanceType: "welcome" },
        query: { surface: "senin geçmişin", scope: "any", confidence: 0.95 },
      },
      { loadIdentity },
    );
    expect(result.status).toBe("ephemeral");
    expect(loadIdentity).not.toHaveBeenCalled();
  });

  it("resolves a canonical fact through the typed runtime seam", async () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_01"));
    const result = await resolveKairaAutobiographicalRecallRuntime(
      {
        instance: { instanceId: "kaira_01", instanceType: "individual" },
        query: {
          surface: "senin favori çiçeğin ne",
          scope: "self_fact",
          factKey: "favorite_flower",
          confidence: 0.96,
        },
      },
      { loadIdentity: async () => ({ status: "loaded", state }) },
    );
    expect(result.status).toBe("resolved");
    expect(result.recall?.selfFacts[0]?.fact.value).toBe("krizantem");
    expect(result.instruction).toContain("favorite_flower");
  });

  it("fails closed when canonical identity persistence is unavailable", async () => {
    const result = await resolveKairaAutobiographicalRecallRuntime(
      {
        instance: { instanceId: "kaira_01", instanceType: "individual" },
        query: { surface: "senin geçmişin", scope: "any", confidence: 0.9 },
      },
      { loadIdentity: async () => ({ status: "unavailable", state: null }) },
    );
    expect(result.status).toBe("unavailable");
    expect(result.instruction).toContain("UYDURMA");
  });

  it("returns grounded no-match semantics for a missing identity seed", async () => {
    const result = await resolveKairaAutobiographicalRecallRuntime(
      {
        instance: { instanceId: "kaira_01", instanceType: "individual" },
        query: { surface: "senin geçmişin", scope: "any", confidence: 0.9 },
      },
      { loadIdentity: async () => ({ status: "missing", state: null }) },
    );
    expect(result.status).toBe("missing");
    expect(result.instruction).toContain("MATCHED_RECORDS=none");
  });
});
