import { describe, expect, it } from "vitest";
import {
  TEST_RUN_SCHEMA_VERSION,
  assertCompleteTestRunProvenance,
  deriveTestStateNamespace,
  isTestRunProvenanceV1,
  type TestRunProvenanceV1,
} from "./testRunProvenance";
import {
  assertReplayEffectAllowed,
  evaluateReplayEffect,
  replayAllowedEffects,
} from "./replaySandboxPolicy";

describe("Slice A1 TestRun provenance", () => {
  const base: TestRunProvenanceV1 = {
    schemaVersion: TEST_RUN_SCHEMA_VERSION,
    identity: {
      testRunId: "TR-2026-09-18-0001",
      environmentId: "test",
      mode: "fresh",
      serverId: "server_test_1",
      kairaInstanceId: "kaira_test_1",
      testerUserId: "tester_1",
      stateNamespace:
        "kaira-test/test/TR-2026-09-18-0001/server_test_1/kaira_test_1",
      startedAt: 1_789_680_000_000,
    },
    versions: {
      privatRoomCommit: "307edbcc2c1a19a3d27beed1e56e9792e2aed516",
      kairaCommit: "43f3bc3b832190097c3172aabd0fbbe9f643f5d1",
      integrationContractVersion: "privatroom-platform-v1",
      systemPromptVersion: "prompt-v1",
      policyConfigVersion: "policy-v1",
      modelProviderVersion: "provider-v1",
      activeFeatureFlags: [],
      scenarioPackVersion: "scenario-pack-v0.4",
    },
    retry: {
      idempotencyChain: ["TR-2026-09-18-0001"],
    },
    humanReview: {
      labels: [],
    },
    trialState: "fresh",
  };

  it("requires exact build/config provenance before a run is valid", () => {
    expect(isTestRunProvenanceV1(base)).toBe(true);
    expect(() => assertCompleteTestRunProvenance(base)).not.toThrow();

    expect(
      isTestRunProvenanceV1({
        ...base,
        versions: { ...base.versions, systemPromptVersion: "" },
      }),
    ).toBe(false);
  });

  it("derives a run/server/instance scoped namespace", () => {
    expect(
      deriveTestStateNamespace({
        environmentId: "test",
        testRunId: "TR 1",
        serverId: "server/1",
        kairaInstanceId: "kaira:1",
      }),
    ).toBe("kaira-test/test/TR_1/server_1/kaira_1");
  });

  it("keeps replay identity explicit instead of inferring it from environment", () => {
    const replay: TestRunProvenanceV1 = {
      ...base,
      identity: { ...base.identity, mode: "replay" },
    };
    expect(isTestRunProvenanceV1(replay)).toBe(true);
    expect(replay.identity.mode).toBe("replay");
  });
});

describe("Slice A1 replay sandbox default-deny policy", () => {
  it("allows only explicitly replay-safe effects", () => {
    expect(evaluateReplayEffect("frozen_context.read").allowed).toBe(true);
    expect(evaluateReplayEffect("kaira.compute").allowed).toBe(true);
    expect(evaluateReplayEffect("replay_knt.write").allowed).toBe(true);
    expect(evaluateReplayEffect("simulated_action.execute").allowed).toBe(true);
  });

  it.each([
    "live_platform.fetch",
    "live_platform.mutate",
    "live_trial.write",
    "production_knt.write",
    "production_memory.write",
    "production_relationship.write",
    "analytics.emit",
    "webhook.emit",
    "external_integration.call",
  ] as const)("denies real-world effect %s", (effect) => {
    expect(evaluateReplayEffect(effect)).toEqual({
      policyVersion: 1,
      effect,
      allowed: false,
      reason: "default_deny",
    });
    expect(() => assertReplayEffectAllowed(effect)).toThrow(
      `replay_sandbox_denied:${effect}`,
    );
  });

  it("exposes an allowlist rather than a denylist contract", () => {
    const allowed = replayAllowedEffects();
    expect(allowed).toContain("frozen_context.read");
    expect(allowed).not.toContain("live_platform.fetch");
    expect(allowed).not.toContain("analytics.emit");
  });
});
