import { describe, expect, it } from "vitest";
import { buildTestRunReviewPacket } from "./testRunReviewPacket";
import type { RestoredTestSession } from "../types/nexus";

describe("TestRun review packet regression", () => {
  it("projects one persisted test session into a stable review packet", () => {
    const restored = {
      session: {
        sessionId: "TR_live_beta_room-1",
        testRunId: "TR_live_beta_room-1",
        testRunRecord: { version: 1, provenance: { identity: { testRunId: "TR_live_beta_room-1" } } },
        userId: "user-1",
        userName: "Tolga",
        characterId: "kairo",
        createdAt: "2026-09-18T05:10:00.000Z",
        updatedAt: "2026-09-18T05:11:00.000Z",
        turnCount: 1,
        active: true,
      },
      summary: {} as any,
      turns: [
        {
          turnId: "turn-1",
          turnNumber: 1,
          sessionId: "TR_live_beta_room-1",
          testRunId: "TR_live_beta_room-1",
          timestamp: "2026-09-18T05:11:00.000Z",
          userMessage: "selam",
          assistantReply: "selam :)",
          speaker: "Tolga",
          intent: "genel_sohbet",
          detectedEmotion: "nötr",
          metadata: {
            providerUsed: "openrouter",
            timings: { totalMs: 420 },
            responsePlan: { continueConversation: true },
          },
          retrievedMemories: [],
        },
      ],
      messages: [],
      lastProviderUsed: "openrouter",
      lastTimings: { totalMs: 420 },
      lastResponsePlan: { continueConversation: true },
    } as RestoredTestSession;

    const packet = buildTestRunReviewPacket(restored);

    expect(packet).toMatchObject({
      version: 1,
      testRunId: "TR_live_beta_room-1",
      sessionId: "TR_live_beta_room-1",
      turnCount: 1,
      userId: "user-1",
      userName: "Tolga",
      lastProviderUsed: "openrouter",
    });
    expect(packet.turns[0]).toMatchObject({
      userMessage: "selam",
      assistantReply: "selam :)",
      providerUsed: "openrouter",
    });
    expect(packet.provenance).toEqual(restored.session.testRunRecord);
  });

  it("does not invent a different review identity when testRunId is present", () => {
    const restored = {
      session: {
        sessionId: "TR_A",
        testRunId: "TR_A",
        userId: "u",
        userName: "U",
        characterId: "kairo",
        createdAt: "2026-09-18T00:00:00.000Z",
        updatedAt: "2026-09-18T00:00:00.000Z",
        turnCount: 0,
        active: true,
      },
      summary: {} as any,
      turns: [],
      messages: [],
    } as RestoredTestSession;

    expect(buildTestRunReviewPacket(restored).testRunId).toBe("TR_A");
  });
});
