import type { TestRunMode } from "./testRunProvenance";

export const TEST_STATE_ISOLATION_VERSION = 1 as const;

export const TEST_STATE_CLASSES = [
  "memory",
  "relationship",
  "appraisal",
  "address_override",
  "capability",
  "knt",
  "trial",
  "conversation_graph",
  "repair",
] as const;

export type TestStateClass = (typeof TEST_STATE_CLASSES)[number];

export interface TestRunStateBindingV1 {
  version: typeof TEST_STATE_ISOLATION_VERSION;
  testRunId: string;
  mode: TestRunMode;
  stateNamespace: string;
  sourceRunId?: string;
  frozenSnapshotId?: string;
}

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function isTestRunStateBindingV1(
  value: unknown,
): value is TestRunStateBindingV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TestRunStateBindingV1>;

  if (
    candidate.version !== TEST_STATE_ISOLATION_VERSION ||
    !nonEmpty(candidate.testRunId) ||
    !nonEmpty(candidate.stateNamespace) ||
    !["fresh", "continuation", "replay"].includes(String(candidate.mode))
  ) {
    return false;
  }

  if (candidate.mode === "fresh") {
    return candidate.sourceRunId === undefined && candidate.frozenSnapshotId === undefined;
  }

  if (candidate.mode === "continuation") {
    return nonEmpty(candidate.sourceRunId) && candidate.frozenSnapshotId === undefined;
  }

  return nonEmpty(candidate.sourceRunId) && nonEmpty(candidate.frozenSnapshotId);
}

export function assertTestRunStateBinding(
  value: unknown,
): asserts value is TestRunStateBindingV1 {
  if (!isTestRunStateBindingV1(value)) {
    throw new Error("invalid_test_run_state_binding_v1");
  }
}

export interface NamespacedStateRecord<T = unknown> {
  stateClass: TestStateClass;
  key: string;
  value: T;
}

const stateKey = (
  namespace: string,
  stateClass: TestStateClass,
  key: string,
): string => `${namespace}::${stateClass}::${key}`;

export class InMemoryNamespacedTestStateStore {
  private readonly records = new Map<string, unknown>();

  write<T>(
    binding: TestRunStateBindingV1,
    stateClass: TestStateClass,
    key: string,
    value: T,
  ): void {
    assertTestRunStateBinding(binding);
    if (!nonEmpty(key)) throw new Error("test_state_key_required");
    this.records.set(stateKey(binding.stateNamespace, stateClass, key), value);
  }

  read<T>(
    binding: TestRunStateBindingV1,
    stateClass: TestStateClass,
    key: string,
  ): T | undefined {
    assertTestRunStateBinding(binding);
    return this.records.get(
      stateKey(binding.stateNamespace, stateClass, key),
    ) as T | undefined;
  }

  copyContinuationSource(
    source: TestRunStateBindingV1,
    target: TestRunStateBindingV1,
  ): void {
    assertTestRunStateBinding(source);
    assertTestRunStateBinding(target);

    if (target.mode !== "continuation") {
      throw new Error("continuation_target_required");
    }
    if (target.sourceRunId !== source.testRunId) {
      throw new Error("continuation_source_run_mismatch");
    }
    if (source.stateNamespace === target.stateNamespace) {
      throw new Error("continuation_namespace_must_fork");
    }

    const prefix = `${source.stateNamespace}::`;
    for (const [key, value] of this.records.entries()) {
      if (!key.startsWith(prefix)) continue;
      const suffix = key.slice(prefix.length);
      this.records.set(`${target.stateNamespace}::${suffix}`, value);
    }
  }

  listNamespace(binding: TestRunStateBindingV1): NamespacedStateRecord[] {
    assertTestRunStateBinding(binding);
    const prefix = `${binding.stateNamespace}::`;
    const result: NamespacedStateRecord[] = [];

    for (const [key, value] of this.records.entries()) {
      if (!key.startsWith(prefix)) continue;
      const suffix = key.slice(prefix.length);
      const separator = suffix.indexOf("::");
      if (separator < 1) continue;
      result.push({
        stateClass: suffix.slice(0, separator) as TestStateClass,
        key: suffix.slice(separator + 2),
        value,
      });
    }

    return result;
  }
}
