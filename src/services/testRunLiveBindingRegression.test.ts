import { describe, expect, it } from "vitest";
import {
  TEST_RUN_SCHEMA_VERSION,
  type TestRunProvenanceV1,
} from "./testRunProvenance";
import type { TestRunStateBindingV1 } from "./testRunStateIsolation";
import { createTestRunRecord } from "./testRunFrozenSnapshot";
import { resolveChatTestRunBinding } from "./testRunLiveBinding";

const provenance: TestRunProvenanceV1 = {
  schemaVersion: TEST_RUN_SCHEMA_VERSION,
  identity: {
    testRunId: "TR_beta_room-123",
    environmentId: "live-beta",
    mode: "fresh",
    serverId: "room-123",
    kairaInstanceId: "kaira-1",
    testerUserId: "user-1",
    stateNamespace: "kaira-test/live-beta/TR_beta_room-123/room-123/kaira-1",
    startedAt: 1_789_680_000_000,
  },
  versions: {
    privatRoomCommit: "44ddb12c3ce221195cb9445f5451ff6ca3ecc86f",
    kairaCommit: "e35571e5f40b6d899e10baf0590d2c221f7ea36a",
    integrationContractVersion: "privatroom-dm-v1",
    systemPromptVersion: "prompt-v1",
    policyConfigVersion: "policy-v1",
    modelProviderVersion: "openrouter:openrouter/free",
    activeFeatureFlags: ["kaira-beta-room"],
    scenarioPackVersion: "social-platform-v0.4",
  },
  retry: { idempotencyChain: ["TR_beta_room-123"] },
  humanReview: { labels: [] },
  trialState: "fresh",
};

const stateBinding: TestRunStateBindingV1 = {
  version: 1,
  testRunId: "TR_beta_room-123",
  mode: "fresh",
  stateNamespace: provenance.identity.stateNamespace,
};

describe("TestRun live binding regression", () => {
  it("preserves legacy sessions when no TestRun context exists", () => {
    expect(
      resolveChatTestRunBinding({
        legacySessionId: "privatroom_room_legacy",
      }),
    ).toEqual({ sessionId: "privatroom_room_legacy" });
  });

  it("binds live beta session identity to the TestRun id", () => {
    const record = createTestRunRecord({ provenance, stateBinding });
    const binding = resolveChatTestRunBinding({
      legacySessionId: "privatroom_room_123",
      record,
    });

    expect(binding.testRunId).toBe("TR_beta_room-123");
    expect(binding.sessionId).toBe("TR_beta_room-123");
    expect(binding.record).toStrictEqual(record);
  });
});
