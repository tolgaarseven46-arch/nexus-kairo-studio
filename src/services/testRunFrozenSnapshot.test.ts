import { describe, expect, it } from "vitest";
import {
  TEST_RUN_SCHEMA_VERSION,
  type TestRunProvenanceV1,
} from "./testRunProvenance";
import type { TestRunStateBindingV1 } from "./testRunStateIsolation";
import {
  FrozenReplayInputReader,
  REPLAY_FROZEN_SNAPSHOT_VERSION,
  createTestRunRecord,
  isReplayFrozenSnapshotV1,
  type ReplayFrozenSnapshotV1,
} from "./testRunFrozenSnapshot";

const provenance = (mode: "fresh" | "continuation" | "replay"): TestRunProvenanceV1 => ({
  schemaVersion: TEST_RUN_SCHEMA_VERSION,
  identity: {
    testRunId: mode === "replay" ? "TR-R" : "TR-A",
    environmentId: "test",
    mode,
    serverId: "server-A",
    kairaInstanceId: "kaira-A",
    testerUserId: "tester-1",
    stateNamespace:
      mode === "replay"
        ? "kaira-test/test/TR-R/server-A/kaira-A"
        : "kaira-test/test/TR-A/server-A/kaira-A",
    startedAt: 1_789_680_000_000,
  },
  versions: {
    privatRoomCommit: "44ddb12c3ce221195cb9445f5451ff6ca3ecc86f",
    kairaCommit: "d1d36dbcb7692f62696cd5b0c1c1d6f7bd06efcf",
    integrationContractVersion: "privatroom-platform-v1",
    systemPromptVersion: "prompt-v1",
    policyConfigVersion: "policy-v1",
    modelProviderVersion: "provider-v1",
    activeFeatureFlags: ["kaira-beta-room"],
    scenarioPackVersion: "scenario-pack-v0.4",
  },
  retry: { idempotencyChain: [mode === "replay" ? "TR-R" : "TR-A"] },
  humanReview: { labels: [] },
  trialState: "fresh",
});

const replayBinding: TestRunStateBindingV1 = {
  version: 1,
  testRunId: "TR-R",
  mode: "replay",
  stateNamespace: "kaira-test/test/TR-R/server-A/kaira-A",
  sourceRunId: "TR-A",
  frozenSnapshotId: "snapshot-TR-A-final",
};

const snapshot: ReplayFrozenSnapshotV1 = {
  version: REPLAY_FROZEN_SNAPSHOT_VERSION,
  snapshotId: "snapshot-TR-A-final",
  sourceTestRunId: "TR-A",
  capturedAt: 1_789_680_100_000,
  platformContext: { serverId: "server-A", roomId: "room-main" },
  capabilityGrants: [{ capability: "message.send", mode: "direct" }],
  rules: { rulesVersion: "rules-v1", rules: [{ id: "r1" }] },
  trialState: "fresh",
  activeFeatureFlags: ["kaira-beta-room"],
  policyConfigVersion: "policy-v1",
  integrationContractVersion: "privatroom-platform-v1",
  conversationEvents: [{ eventId: "evt-1", text: "selam" }],
};

describe("Slice A3 frozen replay snapshot", () => {
  it("accepts a complete frozen platform snapshot", () => {
    expect(isReplayFrozenSnapshotV1(snapshot)).toBe(true);
  });

  it("requires replay records to match source, snapshot and frozen versions", () => {
    const record = createTestRunRecord({
      provenance: provenance("replay"),
      stateBinding: replayBinding,
      replaySnapshot: snapshot,
    });

    expect(record.replaySnapshot?.snapshotId).toBe("snapshot-TR-A-final");

    expect(() =>
      createTestRunRecord({
        provenance: provenance("replay"),
        stateBinding: { ...replayBinding, frozenSnapshotId: "wrong" },
        replaySnapshot: snapshot,
      }),
    ).toThrow("test_run_replay_snapshot_id_mismatch");
  });

  it("forbids replay snapshots on non-replay runs", () => {
    const freshBinding: TestRunStateBindingV1 = {
      version: 1,
      testRunId: "TR-A",
      mode: "fresh",
      stateNamespace: "kaira-test/test/TR-A/server-A/kaira-A",
    };

    expect(() =>
      createTestRunRecord({
        provenance: provenance("fresh"),
        stateBinding: freshBinding,
        replaySnapshot: snapshot,
      }),
    ).toThrow("test_run_non_replay_snapshot_forbidden");
  });

  it("returns defensive copies so replay inputs cannot mutate the frozen snapshot", () => {
    const reader = new FrozenReplayInputReader(snapshot);
    const grants = reader.readCapabilityGrants() as Array<Record<string, unknown>>;
    grants[0].capability = "member.ban";

    expect(
      (reader.readCapabilityGrants()[0] as Record<string, unknown>).capability,
    ).toBe("message.send");

    const events = reader.readConversationEvents() as Array<Record<string, unknown>>;
    events.push({ eventId: "evt-mutated" });
    expect(reader.readConversationEvents()).toHaveLength(1);
  });
});
