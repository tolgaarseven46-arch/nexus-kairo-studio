import { describe, expect, it } from "vitest";
import {
  materializeKairaActivityDescriptors,
  type KairaActivityCatalogEntry,
  type KairaActivityCatalogRuntimeContext,
} from "./kairaActivityCatalogAuthority";
import { generateKairaActivityCandidates } from "./kairaActivityCandidateGenerator";
import { scoreKairaActivityProposal } from "./kairaActivityPlanningPolicy";

const entry = (catalogId: string, overrides: Partial<KairaActivityCatalogEntry> = {}): KairaActivityCatalogEntry => ({
  catalogId,
  activityType: "generic_activity",
  motivationAffinity: { curiosity: 1, recreation: 0.4 },
  preferenceKeys: ["preference:generic"],
  repetitionKey: "generic_family",
  requiredCapabilities: ["world_access"],
  noveltyPotential: 0.8,
  permissionPolicy: "owner_approval",
  evidenceIds: ["catalog:generic"],
  ...overrides,
});

const runtime = (overrides: Partial<KairaActivityCatalogRuntimeContext> = {}): KairaActivityCatalogRuntimeContext => ({
  capabilities: { world_access: true },
  assessments: [{
    catalogId: "alpha",
    availability: "available",
    contextualFit: 0.8,
    interruptionCost: 0.1,
    risk: 0.1,
    notBefore: "2026-09-02T18:00:00.000Z",
    expiresAt: "2026-09-02T20:00:00.000Z",
    evidenceIds: ["runtime:alpha"],
  }],
  ...overrides,
});

const motivation = {
  curiosity: 0.8,
  recreation: 0.6,
  growth: 0.4,
  rest: 0.2,
  social: 0.3,
  self_goal: 0.5,
};

describe("Kaira activity catalog authority contracts", () => {
  it("keeps stable semantics catalog-owned and runtime feasibility runtime-owned", () => {
    const [descriptor] = materializeKairaActivityDescriptors({ catalog: [entry("alpha")], runtime: runtime() });
    expect(descriptor.activityType).toBe("generic_activity");
    expect(descriptor.permissionPolicy).toBe("owner_approval");
    expect(descriptor.motivationAffinity).toEqual({ curiosity: 1, recreation: 0.4 });
    expect(descriptor.availability).toBe("available");
    expect(descriptor.contextualFit).toBe(0.8);
    expect(descriptor.risk).toBe(0.1);
    expect(descriptor.notBefore).toBe("2026-09-02T18:00:00.000Z");
  });

  it("fails closed when a required capability is absent or false", () => {
    for (const capabilities of [{}, { world_access: false }]) {
      const [descriptor] = materializeKairaActivityDescriptors({
        catalog: [entry("alpha")],
        runtime: runtime({ capabilities }),
      });
      expect(descriptor.availability).toBe("blocked");
    }
  });

  it("does not invent a candidate when runtime has no assessment for a catalog entry", () => {
    expect(materializeKairaActivityDescriptors({
      catalog: [entry("alpha")],
      runtime: runtime({ assessments: [] }),
    })).toEqual([]);
  });

  it("ignores runtime assessments for activities the catalog does not authorize", () => {
    const descriptors = materializeKairaActivityDescriptors({
      catalog: [entry("alpha")],
      runtime: runtime({
        assessments: [{
          catalogId: "unknown",
          availability: "available",
          contextualFit: 1,
          interruptionCost: 0,
          risk: 0,
          notBefore: "2026-09-02T18:00:00.000Z",
        }],
      }),
    });
    expect(descriptors).toEqual([]);
  });

  it("rejects duplicate authority records instead of letting array order decide truth", () => {
    expect(() => materializeKairaActivityDescriptors({
      catalog: [entry("alpha"), entry("alpha")],
      runtime: runtime(),
    })).toThrow("Duplicate Kaira activity catalog id");

    const base = runtime().assessments[0];
    expect(() => materializeKairaActivityDescriptors({
      catalog: [entry("alpha")],
      runtime: runtime({ assessments: [base, { ...base }] }),
    })).toThrow("Duplicate Kaira activity runtime assessment id");
  });

  it("preserves authority boundaries through descriptor -> candidate -> score", () => {
    const descriptors = materializeKairaActivityDescriptors({ catalog: [entry("alpha")], runtime: runtime() });
    const [candidate] = generateKairaActivityCandidates({ descriptors, motivation });
    const scored = scoreKairaActivityProposal(candidate);
    expect(scored.candidate.permissionPolicy).toBe("owner_approval");
    expect(scored.candidate.availability).toBe("available");
    expect(scored.components.motivation).toBeGreaterThan(0);
    expect(scored.candidate.evidenceIds).toEqual(expect.arrayContaining([
      "catalog:generic",
      "runtime:alpha",
      "capability:world_access",
    ]));
  });

  it("activity labels are data, not catalog resolver branches", () => {
    const left = materializeKairaActivityDescriptors({ catalog: [entry("alpha", { activityType: "label_a" })], runtime: runtime() });
    const right = materializeKairaActivityDescriptors({ catalog: [entry("alpha", { activityType: "label_b" })], runtime: runtime() });
    const leftScore = scoreKairaActivityProposal(generateKairaActivityCandidates({ descriptors: left, motivation })[0]);
    const rightScore = scoreKairaActivityProposal(generateKairaActivityCandidates({ descriptors: right, motivation })[0]);
    expect(leftScore.score).toBe(rightScore.score);
    expect(leftScore.components).toEqual(rightScore.components);
  });
});
