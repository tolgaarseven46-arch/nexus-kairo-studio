import {
  TEST_RUN_SCHEMA_VERSION,
  assertCompleteTestRunProvenance,
  deriveTestStateNamespace,
  type TestEnvironmentId,
  type TestRunMode,
  type TestRunProvenanceV1,
} from "./testRunProvenance";
import type { TestRunStateBindingV1 } from "./testRunStateIsolation";
import { createTestRunRecord, type TestRunRecordV1 } from "./testRunFrozenSnapshot";

const SHA_RE = /^[0-9a-f]{7,64}$/i;

export interface RuntimeTestRunInputV1 {
  testRunId: string;
  environmentId: TestEnvironmentId;
  mode: Exclude<TestRunMode, "replay">;
  serverId: string;
  kairaInstanceId: string;
  testerUserId: string;
  privatRoomCommit: string;
  scenarioPackVersion?: string;
  trialState?: TestRunProvenanceV1["trialState"];
  retryOf?: string;
  idempotencyChain?: string[];
  sourceRunId?: string;
}

export interface RuntimeVersionEnvironment {
  RENDER_GIT_COMMIT?: string;
  KAIRA_GIT_COMMIT?: string;
  OPENROUTER_MODEL?: string;
  PRIVATROOM_KAIRA_PROVIDER?: string;
  KAIRA_SYSTEM_PROMPT_VERSION?: string;
  KAIRA_POLICY_CONFIG_VERSION?: string;
  KAIRA_ACTIVE_FEATURE_FLAGS?: string;
}

const requireNonEmpty = (value: unknown, code: string): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(code);
  return normalized;
};

const requireSha = (value: unknown, code: string): string => {
  const normalized = requireNonEmpty(value, code);
  if (!SHA_RE.test(normalized)) throw new Error(code);
  return normalized;
};

const featureFlagsFromEnv = (value?: string): string[] =>
  Array.from(
    new Set(
      String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).sort();

export function buildRuntimeTestRunRecordV1(
  input: RuntimeTestRunInputV1,
  env: RuntimeVersionEnvironment = process.env,
): TestRunRecordV1 {
  const kairaCommit = requireSha(
    env.RENDER_GIT_COMMIT || env.KAIRA_GIT_COMMIT,
    "kaira_runtime_commit_required",
  );
  const privatRoomCommit = requireSha(
    input.privatRoomCommit,
    "privatroom_runtime_commit_required",
  );

  const stateNamespace = deriveTestStateNamespace({
    environmentId: input.environmentId,
    testRunId: requireNonEmpty(input.testRunId, "test_run_id_required"),
    serverId: requireNonEmpty(input.serverId, "test_server_id_required"),
    kairaInstanceId: requireNonEmpty(
      input.kairaInstanceId,
      "test_kaira_instance_id_required",
    ),
  });

  const provider =
    env.PRIVATROOM_KAIRA_PROVIDER?.trim() ||
    (env.OPENROUTER_MODEL?.trim() ? "openrouter" : "runtime-default");
  const model = env.OPENROUTER_MODEL?.trim() || "provider-default";

  const provenance: TestRunProvenanceV1 = {
    schemaVersion: TEST_RUN_SCHEMA_VERSION,
    identity: {
      testRunId: input.testRunId,
      environmentId: input.environmentId,
      mode: input.mode,
      serverId: input.serverId,
      kairaInstanceId: input.kairaInstanceId,
      testerUserId: requireNonEmpty(
        input.testerUserId,
        "test_tester_user_id_required",
      ),
      stateNamespace,
      startedAt: Date.now(),
    },
    versions: {
      privatRoomCommit,
      kairaCommit,
      integrationContractVersion: "privatroom-dm-v1",
      systemPromptVersion:
        env.KAIRA_SYSTEM_PROMPT_VERSION?.trim() || "kaira-final-provider-v1",
      policyConfigVersion:
        env.KAIRA_POLICY_CONFIG_VERSION?.trim() || "social-platform-v0.4",
      modelProviderVersion: `${provider}:${model}`,
      activeFeatureFlags: featureFlagsFromEnv(env.KAIRA_ACTIVE_FEATURE_FLAGS),
      scenarioPackVersion:
        input.scenarioPackVersion?.trim() || "social-platform-v0.4",
    },
    retry: {
      retryOf: input.retryOf,
      idempotencyChain:
        input.idempotencyChain?.filter(Boolean) || [input.testRunId],
    },
    humanReview: {
      labels: [],
    },
    trialState: input.trialState || "fresh",
  };

  assertCompleteTestRunProvenance(provenance);

  const stateBinding: TestRunStateBindingV1 =
    input.mode === "continuation"
      ? {
          version: 1,
          testRunId: input.testRunId,
          mode: "continuation",
          stateNamespace,
          sourceRunId: requireNonEmpty(
            input.sourceRunId,
            "continuation_source_run_required",
          ),
        }
      : {
          version: 1,
          testRunId: input.testRunId,
          mode: "fresh",
          stateNamespace,
        };

  return createTestRunRecord({ provenance, stateBinding });
}
