import { createTestRunRecord, type TestRunRecordV1 } from "./testRunFrozenSnapshot";

export interface ChatTestRunBinding {
  testRunId?: string;
  sessionId: string;
  record?: TestRunRecordV1;
}

const safeId = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 160);

export function resolveChatTestRunBinding(input: {
  legacySessionId: string;
  record?: TestRunRecordV1 | null;
}): ChatTestRunBinding {
  const candidate = input.record || undefined;
  if (!candidate) {
    return { sessionId: input.legacySessionId };
  }

  const record = createTestRunRecord({
    provenance: candidate.provenance,
    stateBinding: candidate.stateBinding,
    replaySnapshot: candidate.replaySnapshot,
  });

  const testRunId = record.provenance.identity.testRunId.trim();
  if (!testRunId) {
    throw new Error("test_run_live_binding_missing_id");
  }

  const sessionId = safeId(testRunId);
  if (!sessionId) {
    throw new Error("test_run_live_binding_invalid_session");
  }

  return {
    testRunId,
    sessionId,
    record,
  };
}
