import type { RestoredTestSession, TestSessionTurnRecord } from "../types/nexus";

export const TEST_RUN_REVIEW_PACKET_VERSION = 1 as const;

export interface TestRunReviewTurnV1 {
  turnId: string;
  turnNumber: number;
  timestamp: string;
  userMessage: string;
  assistantReply: string;
  speaker: string;
  intent: string;
  detectedEmotion: string;
  providerUsed?: string;
  timings?: Record<string, number>;
  semanticInterpretation?: unknown;
  semanticEvent?: unknown;
  reasoningTrace?: unknown;
  responsePlan?: unknown;
  dynamicStateBefore?: unknown;
  dynamicStateAfter?: unknown;
  relationshipState?: unknown;
  retrievedMemories?: unknown[];
  memoryUpdate?: unknown;
  consistency?: unknown;
  platformEvent?: unknown;
  welcomeDecision?: unknown;
  realizationVariantSeed?: string;
  realizationVariantId?: string;
}

export interface TestRunReviewPacketV1 {
  version: typeof TEST_RUN_REVIEW_PACKET_VERSION;
  testRunId: string;
  sessionId: string;
  provenance?: unknown;
  userId: string;
  userName: string;
  characterId: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
  active: boolean;
  turns: TestRunReviewTurnV1[];
  lastState?: unknown;
  lastRelationship?: unknown;
  lastResponsePlan?: unknown;
  lastTimings?: unknown;
  lastProviderUsed?: string;
}

const toTurn = (turn: TestSessionTurnRecord): TestRunReviewTurnV1 => ({
  turnId: turn.turnId,
  turnNumber: turn.turnNumber,
  timestamp: turn.timestamp,
  userMessage: turn.userMessage,
  assistantReply: turn.assistantReply,
  speaker: turn.speaker,
  intent: turn.intent,
  detectedEmotion: turn.detectedEmotion,
  providerUsed: turn.metadata?.providerUsed,
  timings: turn.metadata?.timings,
  semanticInterpretation: turn.metadata?.semanticInterpretation,
  semanticEvent: turn.metadata?.semanticEvent,
  reasoningTrace: turn.reasoningTrace,
  responsePlan: turn.metadata?.responsePlan,
  dynamicStateBefore: turn.dynamicStateBefore,
  dynamicStateAfter: turn.dynamicStateAfter,
  relationshipState: turn.relationshipState,
  retrievedMemories: turn.retrievedMemories,
  memoryUpdate: turn.memoryUpdate,
  consistency: turn.consistency,
  platformEvent: turn.metadata?.platformEvent,
  welcomeDecision: turn.metadata?.welcomeDecision,
  realizationVariantSeed: turn.metadata?.realizationVariantSeed,
  realizationVariantId: turn.metadata?.realizationVariantId,
});

export function buildTestRunReviewPacket(
  restored: RestoredTestSession,
): TestRunReviewPacketV1 {
  const testRunId =
    restored.session.testRunId ||
    restored.turns.find((turn) => Boolean(turn.testRunId))?.testRunId ||
    restored.session.sessionId;

  return {
    version: TEST_RUN_REVIEW_PACKET_VERSION,
    testRunId,
    sessionId: restored.session.sessionId,
    provenance: restored.session.testRunRecord,
    userId: restored.session.userId,
    userName: restored.session.userName,
    characterId: restored.session.characterId,
    createdAt: restored.session.createdAt,
    updatedAt: restored.session.updatedAt,
    turnCount: restored.turns.length,
    active: restored.session.active ?? true,
    turns: restored.turns.map(toTurn),
    lastState: restored.lastDynamicState,
    lastRelationship: restored.session.relationship,
    lastResponsePlan: restored.lastResponsePlan,
    lastTimings: restored.lastTimings,
    lastProviderUsed: restored.lastProviderUsed,
  };
}
