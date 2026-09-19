import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("PrivatRoom room conversation ingress v11", () => {
  it("accepts both direct and room conversation kinds at the integration boundary", async () => {
    const source = await readFile(new URL("./privatRoomDmIntegrationRoute.ts", import.meta.url), "utf8");
    expect(source).toContain('kind: "direct" | "room"');
    expect(source).toMatch(/event\.conversation\?\.kind === "direct"[\s\S]*event\.conversation\?\.kind === "room"/);
  });

  it("keeps room traffic mention-agnostic", async () => {
    const source = await readFile(new URL("./privatRoomDmIntegrationRoute.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/@kaira|@kairo|mentionRequired|requiresMention/iu);
    expect(source).toContain("userMessage: event.message.text");
  });
});
