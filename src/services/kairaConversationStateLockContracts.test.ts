import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { projectConversationStateLock } from "./conversationStateLock";
import type { DroitDynamicState } from "../types/nexus";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");
const lockSource = fs.readFileSync(path.resolve(process.cwd(), "src/services/conversationStateLock.ts"), "utf8");
const legacyAuthorityPath = path.resolve(process.cwd(), "src/services/conversationStateAuthority.ts");

const state = (conversationState: "active" | "distancing" | "disengaged" | "repairing") => ({
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  relationship: { conversationState },
}) as DroitDynamicState;

describe("pure conversation state lock projection", () => {
  it.each(["active", "distancing", "repairing", "disengaged"] as const)(
    "projects lock metadata without personality for %s",
    (conversationState) => {
      const result = projectConversationStateLock(state(conversationState));
      expect(result.state).toBe(conversationState);
      expect(result.locked).toBe(conversationState !== "active");
      expect(result).not.toHaveProperty("personality");
    },
  );

  it("keeps the projection independent from personality types", () => {
    expect(lockSource).not.toContain("DroitPersonalityTraits");
    expect(lockSource).not.toContain("personality:");
  });

  it("does not allow the retired conversation-state authority source to return", () => {
    expect(fs.existsSync(legacyAuthorityPath)).toBe(false);
  });

  it("uses responsePersonality directly after KDM instead of passing it through a fake authority", () => {
    expect(server).toContain("conversationStateLock = projectConversationStateLock(kdm.nextDynamicState)");
    expect(server).toContain("responseStylePersonality = responsePersonality");
    expect(server).not.toContain("applyConversationStateAuthority");
    expect(server).not.toContain("authoritativePersonality");
  });

  it("does not expose the retired conversationAuthority compatibility name", () => {
    expect(server).not.toContain("conversationAuthority:");
  });
});
