import { describe, expect, it } from "vitest";
import { summarizeSliceAW9ReviewPacket } from "./sliceAW9ReviewStartupProbe";

describe("Slice A W9 startup review probe regression", () => {
  it("preserves canonical run identity and exposes only review evidence summary", () => {
    const packet = {
      testRunId: "TR_live_beta_room-1",
      sessionId: "TR_live_beta_room-1",
      turnCount: 1,
      provenance: {
        provenance: {
          versions: {
            kairaCommit: "8de75dc71a32f8d4c31c83bcc45ccb4cbd972fb5",
            privatRoomCommit: "033fadf62d175811f2071fd6782c982b65094e9f",
          },
        },
      },
      turns: [
        {
          turnNumber: 1,
          userMessage: "selam kairo",
          assistantReply: "merhaba",
          providerUsed: "openrouter",
          timings: { totalMs: 420 },
          semanticInterpretation: { intent: "greeting" },
          reasoningTrace: { ok: true },
          responsePlan: { continueConversation: true },
          dynamicStateAfter: { calmness: 80 },
          relationshipState: { level: 1 },
          retrievedMemories: [],
          consistency: { accepted: true },
        },
      ],
    } as any;

    expect(summarizeSliceAW9ReviewPacket(packet)).toEqual({
      testRunId: "TR_live_beta_room-1",
      sessionId: "TR_live_beta_room-1",
      turnCount: 1,
      provenance: {
        kairaCommit: "8de75dc71a32f8d4c31c83bcc45ccb4cbd972fb5",
        privatRoomCommit: "033fadf62d175811f2071fd6782c982b65094e9f",
      },
      turns: [
        {
          turnNumber: 1,
          userMessage: "selam kairo",
          assistantReply: "merhaba",
          providerUsed: "openrouter",
          totalMs: 420,
          hasSemantic: true,
          hasReasoning: true,
          hasResponsePlan: true,
          hasState: true,
          hasRelationship: true,
          memoryCount: 0,
          hasConsistency: true,
        },
      ],
    });
  });
  it("does not mutate the captured review packet", () => {
    const packet = {
      testRunId: "TR_X",
      sessionId: "TR_X",
      turnCount: 0,
      provenance: undefined,
      turns: [],
    } as any;
    const before = JSON.stringify(packet);
    summarizeSliceAW9ReviewPacket(packet);
    expect(JSON.stringify(packet)).toBe(before);
  });
});
