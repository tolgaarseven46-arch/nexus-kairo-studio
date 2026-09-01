import { describe, expect, it } from "vitest";
import type { KairaActivityCatalogEntry } from "./kairaActivityCatalogAuthority";
import {
  projectKairaActivityEnvironmentSnapshot,
  type KairaActivityEnvironmentSnapshot,
} from "./kairaActivityEnvironmentAuthority";

const catalog: KairaActivityCatalogEntry[] = [{
  catalogId: "experience_a",
  activityType: "generic",
  motivationAffinity: { curiosity: 1 },
  requiredCapabilities: ["world_access"],
  noveltyPotential: 0.8,
  permissionPolicy: "owner_approval",
}];

const snapshot = (overrides: Partial<KairaActivityEnvironmentSnapshot> = {}): KairaActivityEnvironmentSnapshot => ({
  schemaVersion: 1,
  kairaInstanceId: "kaira_a",
  observedAt: "2026-09-02T12:00:00.000Z",
  entries: [{
    catalogId: "experience_a",
    accessible: true,
    capabilities: { world_access: true },
    contextFit: 0.9,
    risk: 0.1,
    evidenceIds: ["environment:world_access"],
  }],
  ...overrides,
});

describe("Kaira activity environment authority contracts", () => {
  it("projects only typed catalog-bound environment facts", () => {
    expect(projectKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      catalog,
      snapshot: snapshot(),
      now: "2026-09-02T12:05:00.000Z",
    })).toEqual([expect.objectContaining({
      catalogId: "experience_a",
      accessible: true,
      capabilityFacts: { world_access: true },
      baseContextFit: 0.9,
      baseRisk: 0.1,
    })]);
  });

  it("fails closed on owner mismatch", () => {
    expect(() => projectKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_b",
      catalog,
      snapshot: snapshot(),
      now: "2026-09-02T12:05:00.000Z",
    })).toThrow("owner mismatch");
  });

  it("returns no facts for stale or future snapshots", () => {
    expect(projectKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      catalog,
      snapshot: snapshot({ observedAt: "2026-09-02T10:00:00.000Z" }),
      now: "2026-09-02T12:05:00.000Z",
      maxAgeMinutes: 30,
    })).toEqual([]);
    expect(projectKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      catalog,
      snapshot: snapshot({ observedAt: "2026-09-02T12:10:00.000Z" }),
      now: "2026-09-02T12:05:00.000Z",
    })).toEqual([]);
  });

  it("never lets environment invent activities outside the catalog", () => {
    const result = projectKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      catalog,
      snapshot: snapshot({
        entries: [{
          catalogId: "unknown_activity",
          accessible: true,
          capabilities: { world_access: true },
          contextFit: 1,
          risk: 0,
          evidenceIds: ["environment:unknown"],
        }],
      }),
      now: "2026-09-02T12:05:00.000Z",
    });
    expect(result).toEqual([]);
  });

  it("rejects duplicate catalog-bound entries instead of letting order choose truth", () => {
    const duplicate = snapshot();
    duplicate.entries.push({ ...duplicate.entries[0] });
    expect(() => projectKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      catalog,
      snapshot: duplicate,
      now: "2026-09-02T12:05:00.000Z",
    })).toThrow("Duplicate Kaira activity environment entry");
  });

  it("rejects malformed risk/context rather than clamping trusted environment truth", () => {
    const invalid = snapshot();
    invalid.entries[0] = { ...invalid.entries[0], risk: 2 };
    expect(() => projectKairaActivityEnvironmentSnapshot({
      kairaInstanceId: "kaira_a",
      catalog,
      snapshot: invalid,
      now: "2026-09-02T12:05:00.000Z",
    })).toThrow("Invalid Kaira activity environment assessment");
  });
});
