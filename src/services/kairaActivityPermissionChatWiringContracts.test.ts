import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Kaira activity permission chat wiring contracts", () => {
  it("resolves correlated replies and presents pending work on both response paths", () => {
    const server = fs.readFileSync("server.ts", "utf8");
    expect(server).toContain("resolveKairaActivityPermissionChatReply");
    expect(server).toContain("presentKairaActivityPermissionChatPrompt");
    expect(server.match(/await attachActivityPermission\(/g)?.length).toBe(2);
    expect(server.match(/activityPermission: activityPermissionPrompt/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("round-trips opaque request correlation instead of deriving consent from message text alone", () => {
    const client = fs.readFileSync("src/services/droitChatService.ts", "utf8");
    const persistence = fs.readFileSync("src/services/kdmPersistenceService.ts", "utf8");
    expect(client).toContain("message.activityPermissionRequestId");
    expect(client).toContain("activityPermissionRequestId, provider");
    expect(persistence).toContain("turn.metadata?.activityPermission?.requestId");
  });
});
