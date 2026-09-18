import type { TestRunProvenanceV1 } from "./testRunProvenance";
import type { TestRunStateBindingV1 } from "./testRunStateIsolation";

export const REPLAY_FROZEN_SNAPSHOT_VERSION = 1 as const;
export const TEST_RUN_RECORD_VERSION = 1 as const;

export interface FrozenRulesSnapshotV1 {
  rulesVersion: string;
  rules: unknown[];
}

export interface ReplayFrozenSnapshotV1 {
  version: typeof REPLAY_FROZEN_SNAPSHOT_VERSION;
  snapshotId: string;
  sourceTestRunId: string;
  capturedAt: number;
  platformContext: unknown;
  capabilityGrants: unknown[];
  rules: FrozenRulesSnapshotV1;
  trialState: TestRunProvenanceV1["trialState"];
  activeFeatureFlags: string[];
  policyConfigVersion: string;
  integrationContractVersion: string;
  conversationEvents: unknown[];
}

export interface TestRunRecordV1 {
  version: typeof TEST_RUN_RECORD_VERSION;
  provenance: TestRunProvenanceV1;
  stateBinding: TestRunStateBindingV1;
  replaySnapshot?: ReplayFrozenSnapshotV1;
}

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function isReplayFrozenSnapshotV1(
  value: unknown,
): value is ReplayFrozenSnapshotV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ReplayFrozenSnapshotV1>;
  const rules = candidate.rules as Partial<FrozenRulesSnapshotV1> | undefined;

  return (
    candidate.version === REPLAY_FROZEN_SNAPSHOT_VERSION &&
    nonEmpty(candidate.snapshotId) &&
    nonEmpty(candidate.sourceTestRunId) &&
    typeof candidate.capturedAt === "number" &&
    Array.isArray(candidate.capabilityGrants) &&
    typeof rules === "object" &&
    nonEmpty(rules?.rulesVersion) &&
    Array.isArray(rules?.rules) &&
    ["none", "fresh", "mid", "ending", "purchased"].includes(
      String(candidate.trialState),
    ) &&
    Array.isArray(candidate.activeFeatureFlags) &&
    candidate.activeFeatureFlags.every(nonEmpty) &&
    nonEmpty(candidate.policyConfigVersion) &&
    nonEmpty(candidate.integrationContractVersion) &&
    Array.isArray(candidate.conversationEvents)
  );
}

export function createTestRunRecord(input: {
  provenance: TestRunProvenanceV1;
  stateBinding: TestRunStateBindingV1;
  replaySnapshot?: ReplayFrozenSnapshotV1;
}): TestRunRecordV1 {
  const { provenance, stateBinding, replaySnapshot } = input;

  if (provenance.identity.testRunId !== stateBinding.testRunId) {
    throw new Error("test_run_record_identity_mismatch");
  }
  if (provenance.identity.mode !== stateBinding.mode) {
    throw new Error("test_run_record_mode_mismatch");
  }
  if (provenance.identity.stateNamespace !== stateBinding.stateNamespace) {
    throw new Error("test_run_record_namespace_mismatch");
  }

  if (stateBinding.mode === "replay") {
    if (!replaySnapshot || !isReplayFrozenSnapshotV1(replaySnapshot)) {
      throw new Error("test_run_replay_snapshot_required");
    }
    if (stateBinding.sourceRunId !== replaySnapshot.sourceTestRunId) {
      throw new Error("test_run_replay_source_mismatch");
    }
    if (stateBinding.frozenSnapshotId !== replaySnapshot.snapshotId) {
      throw new Error("test_run_replay_snapshot_id_mismatch");
    }
    if (
      provenance.versions.policyConfigVersion !==
        replaySnapshot.policyConfigVersion ||
      provenance.versions.integrationContractVersion !==
        replaySnapshot.integrationContractVersion
    ) {
      throw new Error("test_run_replay_version_mismatch");
    }
  } else if (replaySnapshot !== undefined) {
    throw new Error("test_run_non_replay_snapshot_forbidden");
  }

  return {
    version: TEST_RUN_RECORD_VERSION,
    provenance,
    stateBinding,
    replaySnapshot,
  };
}

export class FrozenReplayInputReader {
  constructor(private readonly snapshot: ReplayFrozenSnapshotV1) {
    if (!isReplayFrozenSnapshotV1(snapshot)) {
      throw new Error("invalid_replay_frozen_snapshot_v1");
    }
  }

  readPlatformContext(): unknown {
    return structuredClone(this.snapshot.platformContext);
  }

  readCapabilityGrants(): unknown[] {
    return structuredClone(this.snapshot.capabilityGrants);
  }

  readRules(): FrozenRulesSnapshotV1 {
    return structuredClone(this.snapshot.rules);
  }

  readTrialState(): TestRunProvenanceV1["trialState"] {
    return this.snapshot.trialState;
  }

  readFeatureFlags(): string[] {
    return [...this.snapshot.activeFeatureFlags];
  }

  readConversationEvents(): unknown[] {
    return structuredClone(this.snapshot.conversationEvents);
  }
}
