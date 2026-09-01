import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const LEGACY_SERVICE = "src/services/kairoLongTermMemoryService.ts";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("legacy long-term memory ownership removal", () => {
  it("does not keep the old user-only free-text memory store", () => {
    expect(existsSync(LEGACY_SERVICE)).toBe(false);
  });

  it("keeps live chat paths on canonical server-owned memory seams", () => {
    const client = source("src/services/droitChatService.ts");
    const server = source("server.ts");

    expect(client).not.toContain("kairoLongTermMemoryService");
    expect(client).not.toContain("saveKairoLongTermMemory");
    expect(client).not.toContain("loadKairoLongTermMemory");

    expect(server).not.toContain("kairoLongTermMemoryService");
    expect(server).toContain("loadRecentKdmMemory");
    expect(server).toContain("loadRecentWorldEventObservations");
  });

  it("does not reintroduce a client-side regex writer for user identity facts", () => {
    const client = source("src/services/droitChatService.ts");
    expect(client).not.toContain("EXPLICIT_NAME_PATTERNS");
    expect(client).not.toContain("captureExplicitUserMemory");
  });
});
