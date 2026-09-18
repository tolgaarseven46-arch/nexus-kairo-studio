import { describe, expect, it } from "vitest";
import { deriveKairaFirstEncounterContinuity } from "./kairaFirstEncounterContinuity";

describe("Kaira first encounter continuity", () => {
  it("keeps welcome assistant text but hides platform pseudo-message", () => {
    const result = deriveKairaFirstEncounterContinuity([
      {
        turnId: "t1",
        turnNumber: 1,
        sessionId: "s",
        timestamp: "2026-09-18T09:00:00.000Z",
        userMessage: "[platform:room.created]",
        assistantReply: "Selam, ben Kaira.",
        speaker: "Oyuncu",
        intent: "platform_welcome",
        detectedEmotion: "nötr",
        metadata: { platformEvent: { eventType: "room.created" } },
      } as any,
    ]);

    expect(result.active).toBe(true);
    expect(result.history).toEqual([
      { sender: "droit", text: "Selam, ben Kaira.", participantName: "Kaira" },
    ]);
  });

  it("expires after three real user chat turns", () => {
    const base = {
      sessionId: "s",
      timestamp: "2026-09-18T09:00:00.000Z",
      speaker: "Tolga",
      detectedEmotion: "nötr",
    };
    const result = deriveKairaFirstEncounterContinuity([
      {
        ...base,
        turnId: "w",
        turnNumber: 1,
        userMessage: "[platform:room.created]",
        assistantReply: "Selam",
        intent: "platform_welcome",
        metadata: { platformEvent: { eventType: "room.created" } },
      } as any,
      ...[1, 2, 3].map((n) => ({
        ...base,
        turnId: `t${n}`,
        turnNumber: n + 1,
        userMessage: `m${n}`,
        assistantReply: `r${n}`,
        intent: "genel_sohbet",
      })),
    ] as any);

    expect(result.active).toBe(false);
    expect(result.chatTurnsAfterWelcome).toBe(3);
  });
});
