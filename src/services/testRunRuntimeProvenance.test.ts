import { describe, expect, it, vi } from "vitest";
import { buildRuntimeTestRunRecordV1 } from "./testRunRuntimeProvenance";

describe("Slice A5 runtime TestRun provenance", () => {
  it("populates a complete Fresh TestRun from real-style runtime version inputs", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_789_680_000_000);

    const record = buildRuntimeTestRunRecordV1(
      {
        testRunId: "TR-live-beta-room-1",
        environmentId: "live-beta",
        mode: "fresh",
        serverId: "server-1",
        kairaInstanceId: "kaira-1",
        testerUserId: "tester-1",
        privatRoomCommit: "44ddb12c3ce221195cb9445f5451ff6ca3ecc86f",
        trialState: "fresh",
      },
      {
        RENDER_GIT_COMMIT: "8f7f8e44a75310ce832e49c021164dcb6f3071b3",
        OPENROUTER_MODEL: "openrouter/free",
        PRIVATROOM_KAIRA_PROVIDER: "openrouter",
        KAIRA_SYSTEM_PROMPT_VERSION: "prompt-v1",
        KAIRA_POLICY_CONFIG_VERSION: "policy-v1",
        KAIRA_ACTIVE_FEATURE_FLAGS: "kaira-beta-room,test-run-v1",
      },
    );

    expect(record.provenance.identity).toMatchObject({
      testRunId: "TR-live-beta-room-1",
      environmentId: "live-beta",
      mode: "fresh",
      serverId: "server-1",
      kairaInstanceId: "kaira-1",
      testerUserId: "tester-1",
      startedAt: 1_789_680_000_000,
    });
    expect(record.provenance.versions).toEqual({
      privatRoomCommit: "44ddb12c3ce221195cb9445f5451ff6ca3ecc86f",
      kairaCommit: "8f7f8e44a75310ce832e49c021164dcb6f3071b3",
      integrationContractVersion: "privatroom-dm-v1",
      systemPromptVersion: "prompt-v1",
      policyConfigVersion: "policy-v1",
      modelProviderVersion: "openrouter:openrouter/free",
      activeFeatureFlags: ["kaira-beta-room", "test-run-v1"],
      scenarioPackVersion: "social-platform-v0.4",
    });

    vi.restoreAllMocks();
  });

  it("fails closed when either deploy SHA is missing or non-authoritative", () => {
    expect(() =>
      buildRuntimeTestRunRecordV1(
        {
          testRunId: "TR-1",
          environmentId: "test",
          mode: "fresh",
          serverId: "server-1",
          kairaInstanceId: "kaira-1",
          testerUserId: "tester-1",
          privatRoomCommit: "local-dev",
        },
        { RENDER_GIT_COMMIT: "8f7f8e44a75310ce832e49c021164dcb6f3071b3" },
      ),
    ).toThrow("privatroom_runtime_commit_required");

    expect(() =>
      buildRuntimeTestRunRecordV1(
        {
          testRunId: "TR-1",
          environmentId: "test",
          mode: "fresh",
          serverId: "server-1",
          kairaInstanceId: "kaira-1",
          testerUserId: "tester-1",
          privatRoomCommit: "44ddb12c3ce221195cb9445f5451ff6ca3ecc86f",
        },
        {},
      ),
    ).toThrow("kaira_runtime_commit_required");
  });

  it("requires an explicit source run for continuation", () => {
    expect(() =>
      buildRuntimeTestRunRecordV1(
        {
          testRunId: "TR-C",
          environmentId: "test",
          mode: "continuation",
          serverId: "server-1",
          kairaInstanceId: "kaira-1",
          testerUserId: "tester-1",
          privatRoomCommit: "44ddb12c3ce221195cb9445f5451ff6ca3ecc86f",
        },
        { RENDER_GIT_COMMIT: "8f7f8e44a75310ce832e49c021164dcb6f3071b3" },
      ),
    ).toThrow("continuation_source_run_required");
  });
});
