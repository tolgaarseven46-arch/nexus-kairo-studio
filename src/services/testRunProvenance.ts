export const TEST_RUN_SCHEMA_VERSION = 1 as const;

export type TestRunMode = "fresh" | "continuation" | "replay";
export type TestEnvironmentId = "test" | "staging" | "live-beta";

export type HumanReviewLabel =
  | "natural"
  | "scripted"
  | "salesy"
  | "interrogative"
  | "suspicious"
  | "fail";

export interface TestRunVersionProvenanceV1 {
  privatRoomCommit: string;
  kairaCommit: string;
  integrationContractVersion: string;
  systemPromptVersion: string;
  policyConfigVersion: string;
  modelProviderVersion: string;
  activeFeatureFlags: string[];
  scenarioPackVersion: string;
}

export interface TestRunIdentityV1 {
  testRunId: string;
  environmentId: TestEnvironmentId;
  mode: TestRunMode;
  serverId: string;
  kairaInstanceId: string;
  testerUserId: string;
  stateNamespace: string;
  startedAt: number;
  endedAt?: number;
}

export interface TestRunRetryProvenanceV1 {
  retryOf?: string;
  idempotencyChain: string[];
}

export interface TestRunHumanReviewV1 {
  labels: HumanReviewLabel[];
  note?: string;
  reviewedAt?: number;
}

export interface TestRunProvenanceV1 {
  schemaVersion: typeof TEST_RUN_SCHEMA_VERSION;
  identity: TestRunIdentityV1;
  versions: TestRunVersionProvenanceV1;
  retry: TestRunRetryProvenanceV1;
  humanReview: TestRunHumanReviewV1;
  trialState: "none" | "fresh" | "mid" | "ending" | "purchased";
}

const NON_EMPTY_SHA = /^[0-9a-f]{7,64}$/i;

const isNonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function deriveTestStateNamespace(input: {
  environmentId: TestEnvironmentId;
  testRunId: string;
  serverId: string;
  kairaInstanceId: string;
}): string {
  return [
    "kaira-test",
    input.environmentId,
    input.testRunId,
    input.serverId,
    input.kairaInstanceId,
  ]
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "_"))
    .join("/");
}

export function isTestRunProvenanceV1(
  value: unknown,
): value is TestRunProvenanceV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TestRunProvenanceV1>;
  const identity = candidate.identity as Partial<TestRunIdentityV1> | undefined;
  const versions = candidate.versions as
    | Partial<TestRunVersionProvenanceV1>
    | undefined;
  const retry = candidate.retry as Partial<TestRunRetryProvenanceV1> | undefined;
  const humanReview = candidate.humanReview as
    | Partial<TestRunHumanReviewV1>
    | undefined;

  const environmentValid =
    identity?.environmentId === "test" ||
    identity?.environmentId === "staging" ||
    identity?.environmentId === "live-beta";
  const modeValid =
    identity?.mode === "fresh" ||
    identity?.mode === "continuation" ||
    identity?.mode === "replay";

  return (
    candidate.schemaVersion === TEST_RUN_SCHEMA_VERSION &&
    environmentValid &&
    modeValid &&
    isNonEmpty(identity?.testRunId) &&
    isNonEmpty(identity?.serverId) &&
    isNonEmpty(identity?.kairaInstanceId) &&
    isNonEmpty(identity?.testerUserId) &&
    isNonEmpty(identity?.stateNamespace) &&
    typeof identity?.startedAt === "number" &&
    (identity.endedAt === undefined || typeof identity.endedAt === "number") &&
    typeof versions?.privatRoomCommit === "string" &&
    NON_EMPTY_SHA.test(versions.privatRoomCommit) &&
    typeof versions?.kairaCommit === "string" &&
    NON_EMPTY_SHA.test(versions.kairaCommit) &&
    isNonEmpty(versions?.integrationContractVersion) &&
    isNonEmpty(versions?.systemPromptVersion) &&
    isNonEmpty(versions?.policyConfigVersion) &&
    isNonEmpty(versions?.modelProviderVersion) &&
    Array.isArray(versions?.activeFeatureFlags) &&
    versions.activeFeatureFlags.every(isNonEmpty) &&
    isNonEmpty(versions?.scenarioPackVersion) &&
    Array.isArray(retry?.idempotencyChain) &&
    retry.idempotencyChain.every(isNonEmpty) &&
    (retry.retryOf === undefined || isNonEmpty(retry.retryOf)) &&
    Array.isArray(humanReview?.labels) &&
    humanReview.labels.every((label) =>
      ["natural", "scripted", "salesy", "interrogative", "suspicious", "fail"].includes(
        String(label),
      ),
    ) &&
    (humanReview.note === undefined || typeof humanReview.note === "string") &&
    (humanReview.reviewedAt === undefined ||
      typeof humanReview.reviewedAt === "number") &&
    ["none", "fresh", "mid", "ending", "purchased"].includes(
      String(candidate.trialState),
    )
  );
}

export function assertCompleteTestRunProvenance(
  value: unknown,
): asserts value is TestRunProvenanceV1 {
  if (!isTestRunProvenanceV1(value)) {
    throw new Error("invalid_test_run_provenance_v1");
  }
}
