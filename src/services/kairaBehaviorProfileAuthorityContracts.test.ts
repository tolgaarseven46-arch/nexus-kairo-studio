import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const client = read("src/services/droitChatService.ts");
const server = read("server.ts");

describe("authoritative behavior profile boundary", () => {
  it("does not compute or send a parallel client behavior profile", () => {
    expect(client).not.toContain("computeBehaviorProfile(runtimePersonality, userMessage)");
    expect(client).not.toContain("personality: runtimePersonality, behaviorProfile, personalityTendency:");
  });

  it("returns the KDM behavior profile from both server response paths", () => {
    const marker = "worldMemoryGuard, behaviorContract, behaviorProfile, responsePlan, conversationAuthority:";
    expect(server.split(marker).length - 1).toBeGreaterThanOrEqual(2);
  });

  it("requires the client to expose the server profile to callers", () => {
    expect(client).toContain("authoritativeBehaviorProfile");
    expect(client).toContain("profile: authoritativeBehaviorProfile");
    expect(client).toContain("Authoritative behavior profile missing from server response");
  });
});
