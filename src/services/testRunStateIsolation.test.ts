import { describe, expect, it } from "vitest";
import { deriveTestStateNamespace } from "./testRunProvenance";
import {
  InMemoryNamespacedTestStateStore,
  TEST_STATE_CLASSES,
  isTestRunStateBindingV1,
  type TestRunStateBindingV1,
} from "./testRunStateIsolation";

const binding = (
  overrides: Partial<TestRunStateBindingV1> = {},
): TestRunStateBindingV1 => ({
  version: 1,
  testRunId: "TR-A",
  mode: "fresh",
  stateNamespace: "kaira-test/test/TR-A/server-A/kaira-A",
  ...overrides,
});

describe("Slice A2 state binding", () => {
  it("requires explicit source identity for continuation and frozen source for replay", () => {
    expect(isTestRunStateBindingV1(binding())).toBe(true);

    expect(
      isTestRunStateBindingV1(
        binding({
          testRunId: "TR-B",
          mode: "continuation",
          stateNamespace: "kaira-test/test/TR-B/server-A/kaira-A",
          sourceRunId: "TR-A",
        }),
      ),
    ).toBe(true);

    expect(
      isTestRunStateBindingV1(
        binding({
          testRunId: "TR-R",
          mode: "replay",
          stateNamespace: "kaira-test/test/TR-R/server-A/kaira-A",
          sourceRunId: "TR-A",
          frozenSnapshotId: "snapshot-TR-A-final",
        }),
      ),
    ).toBe(true);

    expect(
      isTestRunStateBindingV1(
        binding({
          mode: "replay",
          sourceRunId: "TR-A",
          frozenSnapshotId: undefined,
        }),
      ),
    ).toBe(false);
  });

  it("derives different namespaces for the same human in different servers/instances", () => {
    const a = deriveTestStateNamespace({
      environmentId: "test",
      testRunId: "TR-A",
      serverId: "server-A",
      kairaInstanceId: "kaira-A",
    });
    const b = deriveTestStateNamespace({
      environmentId: "test",
      testRunId: "TR-B",
      serverId: "server-B",
      kairaInstanceId: "kaira-B",
    });
    expect(a).not.toBe(b);
  });
});

describe("Slice A2 zero-leak state store proof", () => {
  it.each(TEST_STATE_CLASSES)(
    "keeps %s isolated across server/Kaira namespaces",
    (stateClass) => {
      const store = new InMemoryNamespacedTestStateStore();
      const a = binding();
      const b = binding({
        testRunId: "TR-B",
        stateNamespace: "kaira-test/test/TR-B/server-B/kaira-B",
      });

      store.write(a, stateClass, "user-1", { owner: "A", stateClass });

      expect(store.read(a, stateClass, "user-1")).toEqual({
        owner: "A",
        stateClass,
      });
      expect(store.read(b, stateClass, "user-1")).toBeUndefined();
    },
  );

  it("treats explicit form-of-address override as isolated state", () => {
    const store = new InMemoryNamespacedTestStateStore();
    const a = binding();
    const b = binding({
      testRunId: "TR-B",
      stateNamespace: "kaira-test/test/TR-B/server-B/kaira-B",
    });

    store.write(a, "address_override", "user-1", {
      formality: "formal",
      explicit: true,
    });

    expect(store.read(b, "address_override", "user-1")).toBeUndefined();
  });

  it("copies continuation state only through an explicit source-run fork", () => {
    const store = new InMemoryNamespacedTestStateStore();
    const source = binding();
    const continuation = binding({
      testRunId: "TR-C",
      mode: "continuation",
      stateNamespace: "kaira-test/test/TR-C/server-A/kaira-A",
      sourceRunId: "TR-A",
    });

    store.write(source, "memory", "user-1", { fact: "source-only" });
    expect(store.read(continuation, "memory", "user-1")).toBeUndefined();

    store.copyContinuationSource(source, continuation);

    expect(store.read(continuation, "memory", "user-1")).toEqual({
      fact: "source-only",
    });
    expect(continuation.stateNamespace).not.toBe(source.stateNamespace);
  });

  it("rejects implicit continuation from the wrong run", () => {
    const store = new InMemoryNamespacedTestStateStore();
    const source = binding();
    const continuation = binding({
      testRunId: "TR-C",
      mode: "continuation",
      stateNamespace: "kaira-test/test/TR-C/server-A/kaira-A",
      sourceRunId: "TR-OTHER",
    });

    expect(() => store.copyContinuationSource(source, continuation)).toThrow(
      "continuation_source_run_mismatch",
    );
  });
});
