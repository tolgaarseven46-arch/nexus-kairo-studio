import { describe, expect, it } from "vitest";
import { decideKairaWelcome } from "./kairaWelcomeDecision";
import { realizeKairaWelcome } from "./kairaWelcomeRealizer";

describe("PrivatRoom canonical welcome regression", () => {
  it("keeps platform lifecycle observational and Kaira-owned decision cold-start", () => {
    const decision = decideKairaWelcome({
      eventType: "room.created",
      actorDisplayName: "Tolga",
      roomName: "Deneme",
      isOwner: true,
    });

    expect(decision.shouldWelcome).toBe(true);
    expect(decision.relationshipMode).toBe("cold_start");
    expect(decision.memoryAllowed).toBe(false);
    expect(decision.introduceSelf).toBe(true);
    expect(decision.maxQuestions).toBe(1);
  });

  it("replays byte-for-byte for the same lifecycle event seed", () => {
    const decision = decideKairaWelcome({
      eventType: "participant.joined",
      actorDisplayName: "Mert",
      roomName: "Deneme",
      isOwner: false,
    });
    const input = {
      eventId: "lifecycle_same_event",
      kairaInstanceId: "kaira_reference_001",
      actorDisplayName: "Mert",
      roomName: "Deneme",
      decision,
    };

    const first = realizeKairaWelcome(input);
    const replay = realizeKairaWelcome(input);
    expect(replay).toEqual(first);
    expect(replay.realizationVariantSeed).toBe(first.realizationVariantSeed);
  });

  it("never exposes internal architecture vocabulary", () => {
    const decision = decideKairaWelcome({
      eventType: "room.created",
      actorDisplayName: "Tolga",
      roomName: "Deneme",
      isOwner: true,
    });
    const realized = realizeKairaWelcome({
      eventId: "lifecycle_no_jargon",
      kairaInstanceId: "kaira_reference_001",
      actorDisplayName: "Tolga",
      roomName: "Deneme",
      decision,
    });

    expect(realized.text).not.toMatch(
      /droit|capability|pipeline|system prompt|yapay zeka/iu,
    );
  });

  it("does not address users by generic beta labels", () => {
    const decision = decideKairaWelcome({
      eventType: "room.created",
      actorDisplayName: "Oyuncu",
      roomName: "Deneme",
      isOwner: true,
    });
    const realized = realizeKairaWelcome({
      eventId: "lifecycle_generic_name",
      kairaInstanceId: "kaira_reference_001",
      actorDisplayName: "Oyuncu",
      roomName: "Deneme",
      decision,
    });

    expect(realized.text).not.toMatch(/beta kullanıcısı|oyuncu/iu);
  });
});
