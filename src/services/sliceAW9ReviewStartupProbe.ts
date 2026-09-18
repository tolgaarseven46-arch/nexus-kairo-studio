import { buildTestRunReviewPacket } from "./testRunReviewPacket";

export function summarizeSliceAW9ReviewPacket(
  packet: ReturnType<typeof buildTestRunReviewPacket>,
) {
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
