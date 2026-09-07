import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("final delivery enforcement characterization", () => {
  it("gates every user-facing chat payload on final consistency acceptance", () => {
    const source = readFileSync(resolve(process.cwd(), "server.ts"), "utf8");
    const gateMatches = source.match(/if\s*\(\s*!consistency\.accepted\s*\)\s*\{/gu) ?? [];
    const sendMatches = source.match(/await sendChatPayload\(\{/gu) ?? [];
    expect(gateMatches.length).toBe(sendMatches.length);
    expect(gateMatches.length).toBeGreaterThanOrEqual(2);
  });

  it("does not persist a rejected assistant candidate but keeps conversational persistence non-empty", () => {
    const gateSource = readFileSync(resolve(process.cwd(), "src/services/kairaFinalDeliveryGate.ts"), "utf8");
    expect(gateSource).toContain("export const KAIRA_FINAL_REJECTION_FALLBACK");
    expect(gateSource).toContain("persistedReply: accepted ? candidate : KAIRA_FINAL_REJECTION_FALLBACK");
    expect(gateSource).not.toContain("persistedReply: accepted ? candidate : \"\"");
  });
});
