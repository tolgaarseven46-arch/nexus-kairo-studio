import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { decideKairaWelcome } from "./kairaWelcomeDecision";
import { realizeKairaWelcome } from "./kairaWelcomeRealizer";

describe("natural compositional Kaira welcome v10", () => {
  it("does not keep whole welcome messages in a fixed variant pool", async () => {
    const source = await readFile(new URL("./kairaWelcomeRealizer.ts", import.meta.url), "utf8");
    expect(source).not.toContain("ROOM_CREATED_VARIANTS");
    expect(source).not.toContain("PARTICIPANT_JOINED_VARIANTS");
    expect(source).toContain("opening");
    expect(source).toContain("identity");
    expect(source).toContain("roomBeat");
  });

  it("keeps owner cold-start concise, characterful and non-assistant-like", () => {
    const decision = decideKairaWelcome({
      eventType: "room.created",
      actorDisplayName: "Tolga",
      roomName: "Deneme",
      isOwner: true,
    });
    const results = Array.from({ length: 12 }, (_, index) =>
      realizeKairaWelcome({
        eventId: `evt-owner-${index}`,
        kairaInstanceId: "kaira_reference_001",
        actorDisplayName: "Tolga",
        roomName: "Deneme",
        decision,
      }).text,
    );

    expect(new Set(results).size).toBeGreaterThanOrEqual(6);
    for (const text of results) {
      expect(text.split(/[.!?]+/u).filter(Boolean).length).toBeLessThanOrEqual(2);
      expect(text).toMatch(/kaira/iu);
      expect(text).not.toMatch(/nasıl yardımcı olabilirim|bir şeye ihtiyacın olursa|gerektiğinde (?:yanındayım|el atarım)|droit|yapay zeka/iu);
      expect(text).not.toMatch(/burayı sen şekillendiriyorsun|sen yön ver/iu);
    }
  });

  it("does not re-introduce Kaira to ordinary participant joins", () => {
    const decision = decideKairaWelcome({
      eventType: "participant.joined",
      actorDisplayName: "Mert",
      roomName: "Deneme",
      isOwner: false,
    });
    const result = realizeKairaWelcome({
      eventId: "evt-member",
      kairaInstanceId: "kaira_reference_001",
      actorDisplayName: "Mert",
      roomName: "Deneme",
      decision,
    });
    expect(result.text).not.toMatch(/ben kaira|kaira ben/iu);
    expect(result.text).toMatch(/hoş geldin|selam|hey/iu);
  });
});
