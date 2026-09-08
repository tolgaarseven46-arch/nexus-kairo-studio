import { describe, expect, it } from "vitest";
import { resolveKairaInstanceContext } from "./kairaInstanceContext";
import { loadSocialAppraisalAutobiographicalRuntime } from "./socialAppraisalAutobiographicalRuntime";

const instance = resolveKairaInstanceContext({
  instanceId: "kaira_default",
  instanceType: "persistent",
});

function memory(participantIds: string[], id: string) {
  return {
    id,
    canonical: true,
    origin: "lived",
    sensitivity: "ordinary",
    participantIds,
    facts: [],
    emotions: [{ label: "warmth", intensity: 0.8 }],
    salience: 0.9,
  } as any;
}

describe("social appraisal autobiographical runtime", () => {
  it("projects only the exact active user's canonical lived episodes", async () => {
    const result = await loadSocialAppraisalAutobiographicalRuntime(
      { instance, userId: "alice" },
      {
        loadIdentity: async () => ({
          status: "loaded",
          state: {
            kairaInstanceId: instance.instanceId,
            schemaVersion: 1,
            selfFacts: [],
            autobiographicalMemories: [
              memory(["user:alice"], "alice-1"),
              memory(["user:bob"], "bob-1"),
            ],
          } as any,
        }),
      },
    );

    expect(result.status).toBe("loaded");
    expect(result.memory?.autobiographical?.participantId).toBe("user:alice");
    expect(result.memory?.autobiographical?.episodeCount).toBe(1);
  });

  it("keeps G4 baseline-compatible when the canonical identity is missing", async () => {
    const result = await loadSocialAppraisalAutobiographicalRuntime(
      { instance, userId: "alice" },
      { loadIdentity: async () => ({ status: "missing", state: null }) },
    );

    expect(result).toEqual({ status: "missing", memory: undefined });
  });
});
