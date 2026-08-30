import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { applyConversationStateAuthority } from "./conversationStateAuthority";
import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";

const server = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");

const personality = {
  humor: 80,
  empathy: 60,
  communication: 55,
} as unknown as DroitPersonalityTraits;

const state = (conversationState: "active" | "distancing" | "disengaged" | "repairing") => ({
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  relationship: { conversationState },
}) as DroitDynamicState;

describe("conversation state authority non-mutation boundary", () => {
  it.each(["active", "distancing", "repairing", "disengaged"] as const)(
    "keeps response personality unchanged for %s",
    (conversationState) => {
      const result = applyConversationStateAuthority(personality, state(conversationState));
      expect(result.personality).toBe(personality);
      expect(result.personality.humor).toBe(80);
      expect(result.locked).toBe(conversationState !== "active");
    },
  );

  it("keeps WHAT/WHETHER restrictions in the canonical response plan", () => {
    expect(server).toContain("continueConversation: responsePlan.continueConversation");
    expect(server).toContain("humorAllowed: responsePlan.allowHumor");
    expect(server).toContain("askQuestion: responsePlan.allowQuestion");
  });
});
