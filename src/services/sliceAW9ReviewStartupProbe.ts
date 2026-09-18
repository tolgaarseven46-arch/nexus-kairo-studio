import { loadTestSession } from "./kdmPersistenceService";
import { buildTestRunReviewPacket } from "./testRunReviewPacket";

const SLICE_A_W9_TEST_RUN_ID =
  "TR_live_beta_slice-a-acceptance-35310419905";

export function summarizeSliceAW9ReviewPacket(packet: ReturnType<typeof buildTestRunReviewPacket>) {
  return {
    testRunId: packet.testRunId,
    sessionId: packet.sessionId,
    turnCount: packet.turnCount,
    provenance: {
      kairaCommit:
        (packet.provenance as any)?.provenance?.versions?.kairaCommit ?? null,
      privatRoomCommit:
        (packet.provenance as any)?.provenance?.versions?.privatRoomCommit ?? null,
    },
    turns: packet.turns.map((turn) => ({
      turnNumber: turn.turnNumber,
      userMessage: turn.userMessage,
      assistantReply: turn.assistantReply,
      providerUsed: turn.providerUsed ?? null,
      totalMs: turn.timings?.totalMs ?? null,
      hasSemantic:
        turn.semanticInterpretation != null || turn.semanticEvent != null,
      hasReasoning: turn.reasoningTrace != null,
      hasResponsePlan: turn.responsePlan != null,
      hasState:
        turn.dynamicStateBefore != null || turn.dynamicStateAfter != null,
      hasRelationship: turn.relationshipState != null,
      memoryCount: turn.retrievedMemories?.length ?? 0,
      hasConsistency: turn.consistency != null,
    })),
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runSliceAW9StartupProbe(): Promise<void> {
  try {
    let restored = await loadTestSession(SLICE_A_W9_TEST_RUN_ID);
    for (const delayMs of [5_000, 15_000, 30_000]) {
      if (restored) break;
      await sleep(delayMs);
      restored = await loadTestSession(SLICE_A_W9_TEST_RUN_ID);
    }
    if (!restored) {
      console.warn("[Slice A W9 Review Probe] test run not found after retries", {
        testRunId: SLICE_A_W9_TEST_RUN_ID,
      });
      return;
    }

    const packet = buildTestRunReviewPacket(restored);
    const sanitized = summarizeSliceAW9ReviewPacket(packet);

    console.log(
      "[Slice A W9 Review Probe] PASS",
      JSON.stringify(sanitized),
    );
  } catch (error) {
    console.error(
      "[Slice A W9 Review Probe] FAIL",
      error instanceof Error ? error.message : String(error),
    );
  }
}
