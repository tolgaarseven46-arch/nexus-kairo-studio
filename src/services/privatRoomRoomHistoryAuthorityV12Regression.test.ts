import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("PrivatRoom room history authority v12", () => {
  it("accepts platform-owned recent room history on the room transport", async () => {
    const source = await readFile(new URL("./privatRoomDmIntegrationRoute.ts", import.meta.url), "utf8");
    expect(source).toContain("recentHistory");
    expect(source).toContain("deriveKairaFirstEncounterContinuityFromPlatformHistory");
  });

  it("skips TestSession restore when typed room history is supplied", async () => {
    const source = await readFile(new URL("./privatRoomDmIntegrationRoute.ts", import.meta.url), "utf8");
    expect(source).toContain('event.conversation.kind === "room"');
    expect(source).toMatch(/platformFirstEncounter[\s\S]*\?\s*null[\s\S]*:\s*await loadTestSession/);
  });

  it("keeps first-encounter activation decision inside Kaira", async () => {
    const source = await readFile(new URL("./kairaFirstEncounterContinuity.ts", import.meta.url), "utf8");
    expect(source).toContain("deriveKairaFirstEncounterContinuityFromPlatformHistory");
    expect(source).toContain("chatTurnsAfterWelcome < 3");
  });
});
