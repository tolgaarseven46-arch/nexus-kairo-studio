import { describe, expect, it } from "vitest";
import { sanitizeKntTracePayloadForPersistence } from "./kdmPersistenceService";

describe("KNT trace Firestore payload sanitization", () => {
  it("recursively removes undefined relationship fields without changing defined evidence", () => {
    const payload = {
      userId: "raw-user",
      testRunId: "TR_live",
      sessionId: "session_live",
      userMessage: "bilmiyom daha",
      reply: "Ben başlangıcı toparlayayım.",
      reasoningTrace: { relationship: {} } as any,
      dynamicState: {
        calmness: 70,
        anger: 10,
        stress: 20,
        happiness: 70,
        confidence: 70,
        surprise: 10,
        lastStatus: "Sakin",
        relationship: {
          firstSeenAt: "2026-09-19T00:00:00.000Z",
          lastInteractionAt: "2026-09-19T00:00:01.000Z",
          interactionCount: 1,
          familiarityDays: 0,
          warmth: 50,
          trust: 50,
          positiveEvents: 0,
          negativeEvents: 0,
          conflictScore: 0,
          hurtScore: 0,
          repairProgress: 0,
          repeatedNegativeCount: 0,
          disengagedAt: undefined,
          disengageReason: undefined,
        },
      } as any,
      timings: { serverTotalMs: 3200 },
      providerUsed: "local_language",
      createdAt: "2026-09-19T00:00:02.000Z",
    };

    const sanitized = sanitizeKntTracePayloadForPersistence(payload as any, "scoped_user");

    expect(sanitized.userId).toBe("scoped_user");
    expect(sanitized.createdAt).toBe("2026-09-19T00:00:02.000Z");
    expect(sanitized.dynamicState.relationship).toMatchObject({
      firstSeenAt: "2026-09-19T00:00:00.000Z",
      interactionCount: 1,
      warmth: 50,
    });
    expect("disengagedAt" in sanitized.dynamicState.relationship!).toBe(false);
    expect("disengageReason" in sanitized.dynamicState.relationship!).toBe(false);
    expect(JSON.stringify(sanitized)).not.toContain("undefined");
  });
});
