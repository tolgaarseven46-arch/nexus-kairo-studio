import { describe, expect, it } from "vitest";
import { decideKairaWelcome } from "./kairaWelcomeDecision";
import { realizeKairaWelcome } from "./kairaWelcomeRealizer";

describe("canonical Kaira welcome", () => {
  it("keeps cold-start authority and blocks internal jargon", () => {
    const decision = decideKairaWelcome({
      eventType: "room.created",
      actorDisplayName: "Tolga",
      roomName: "Deneme",
      isOwner: true,
    });
    expect(decision.relationshipMode).toBe("cold_start");
    expect(decision.memoryAllowed).toBe(false);
    expect(decision.maxQuestions).toBe(1);
    expect(decision.prohibitedTerms).toContain("Droit");
  });

  it("is deterministic for the same lifecycle event", () => {
    const decision = decideKairaWelcome({
      eventType: "room.created",
      actorDisplayName: "Tolga",
      roomName: "Deneme",
      isOwner: true,
    });
    const input = {
      eventId: "evt-1",
      kairaInstanceId: "kaira_reference_001",
      actorDisplayName: "Tolga",
      roomName: "Deneme",
      decision,
    };
    expect(realizeKairaWelcome(input)).toEqual(realizeKairaWelcome(input));
  });

  it("never leaks internal terms", () => {
    const decision = decideKairaWelcome({
      eventType: "participant.joined",
      actorDisplayName: "Mert",
      roomName: "Deneme",
      isOwner: false,
    });
    const result = realizeKairaWelcome({
      eventId: "evt-2",
      kairaInstanceId: "kaira_reference_001",
      actorDisplayName: "Mert",
      roomName: "Deneme",
      decision,
    });
    expect(result.text).not.toMatch(/droit|capability|pipeline|system prompt|yapay zeka/iu);
  });
});
