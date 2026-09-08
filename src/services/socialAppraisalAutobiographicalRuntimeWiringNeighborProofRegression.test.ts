import { describe, expect, it } from "vitest";
import { resolveKairaInstanceContext } from "./kairaInstanceContext";
import { loadSocialAppraisalAutobiographicalRuntime } from "./socialAppraisalAutobiographicalRuntime";

const instance = resolveKairaInstanceContext({
  instanceId: "kaira_default",
  instanceType: "individual",
});

function episode(
  id: string,
  participantIds: string[],
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    canonical: true,
    origin: "lived",
    sensitivity: "ordinary",
    participantIds,
    facts: [],
    emotions: [{ label: "warmth", intensity: 0.8 }],
    salience: 0.9,
    ...overrides,
  } as any;
}

function loadedIdentity(memories: any[]) {
  return {
    status: "loaded" as const,
    state: {
      kairaInstanceId: instance.instanceId,
      schemaVersion: 1,
      selfFacts: [],
      autobiographicalMemories: memories,
    } as any,
  };
}

describe("G4 autobiographical production wiring historical proof", () => {
  it("reported: upstream runtime projects only the exact active user's canonical lived episodes", async () => {
    const result = await loadSocialAppraisalAutobiographicalRuntime(
      { instance, userId: "alice" },
      {
        loadIdentity: async () =>
          loadedIdentity([
            episode("alice-1", ["user:alice"]),
            episode("bob-1", ["user:bob"]),
          ]),
      },
    );

    expect(result.status).toBe("loaded");
    expect(result.memory?.autobiographical?.participantId).toBe("user:alice");
    expect(result.memory?.autobiographical?.episodeCount).toBe(1);
  });

  it("neighbor-1: non-canonical and non-lived records cannot enter the G4 memory projection", async () => {
    const result = await loadSocialAppraisalAutobiographicalRuntime(
      { instance, userId: "alice" },
      {
        loadIdentity: async () =>
          loadedIdentity([
            episode("valid", ["user:alice"]),
            episode("noncanonical", ["user:alice"], { canonical: false }),
            episode("inferred", ["user:alice"], { origin: "inferred" }),
          ]),
      },
    );

    expect(result.memory?.autobiographical?.episodeCount).toBe(1);
  });

  it("neighbor-2: sensitive autobiographical records remain outside the bounded appraisal context", async () => {
    const result = await loadSocialAppraisalAutobiographicalRuntime(
      { instance, userId: "alice" },
      {
        loadIdentity: async () =>
          loadedIdentity([
            episode("ordinary", ["user:alice"]),
            episode("sensitive", ["user:alice"], { sensitivity: "sensitive" }),
          ]),
      },
    );

    expect(result.memory?.autobiographical?.episodeCount).toBe(1);
  });

  it("counterexample: missing canonical identity preserves the memory-free baseline", async () => {
    const result = await loadSocialAppraisalAutobiographicalRuntime(
      { instance, userId: "alice" },
      { loadIdentity: async () => ({ status: "missing", state: null }) },
    );

    expect(result).toEqual({ status: "missing", memory: undefined });
  });
});
