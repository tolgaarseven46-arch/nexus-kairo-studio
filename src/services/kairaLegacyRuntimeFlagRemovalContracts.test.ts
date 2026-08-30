import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const integration = read("src/services/behaviorIntegrationEngine.ts");
const conversationStateLock = read("src/services/conversationStateLock.ts");
const server = read("server.ts");

const LEGACY_RUNTIME_KEYS = [
  "runtimeContinueConversation",
  "runtimeHumorAllowed",
  "runtimeAskQuestion",
  "runtimeAcknowledgeComplaint",
  "runtimeRepairAllowed",
  "runtimeStance",
  "runtimeResponseLength",
  "runtimeDirectness",
  "runtimeWarmth",
  "runtimeDistance",
  "runtimePriority",
  "runtimePriorConversationState",
  "runtimeRepairSignal",
];

describe("legacy runtime decision flag removal", () => {
  it("does not encode integrated decisions back into response personality", () => {
    for (const key of LEGACY_RUNTIME_KEYS) expect(integration).not.toContain(`${key}:`);
    expect(integration).toContain("const decision: IntegratedBehaviorDecision = {");
  });

  it("does not use dead runtime fields or replacement trait mutation in conversation-state authority", () => {
    for (const key of LEGACY_RUNTIME_KEYS) expect(conversationStateLock).not.toContain(key);
    expect(conversationStateLock).not.toContain("humor: 0");
    expect(conversationStateLock).not.toContain("humor: Math.min(20");
    expect(conversationStateLock).not.toContain("personality");
  });

  it("keeps final WHAT/WHETHER authority in responsePlan", () => {
    expect(server).toContain("continueConversation: responsePlan.continueConversation");
    expect(server).toContain("humorAllowed: responsePlan.allowHumor");
    expect(server).toContain("askQuestion: responsePlan.allowQuestion");
  });
});
