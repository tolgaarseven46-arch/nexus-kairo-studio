import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const server = read("server.ts");
const plan = read("src/services/kairaResponsePlan.ts");
const local = read("src/services/kairoLocalLanguageEngine.ts");

describe("KairaResponsePlan final WHAT/WHETHER authority", () => {
  it("derives final enforcement permissions from the canonical response plan", () => {
    expect(server).toContain("continueConversation: responsePlan.continueConversation");
    expect(server).toContain("humorAllowed: responsePlan.allowHumor");
    expect(server).toContain("askQuestion: responsePlan.allowQuestion");
  });

  it("does not let legacy runtime personality flags veto the live response plan", () => {
    expect(server).not.toContain('runtimeFlag(authoritativePersonality, "runtimeContinueConversation"');
    expect(server).not.toContain('runtimeFlag(authoritativePersonality, "runtimeHumorAllowed"');
    expect(server).not.toContain('runtimeFlag(authoritativePersonality, "runtimeAskQuestion"');
  });

  it("keeps the declared single-authority contract explicit", () => {
    expect(plan).toContain("KAIRA CEVAP PLANI (TEK DAVRANIŞ OTORİTESİ):");
    expect(plan).toContain("Bu plan WHAT/WHETHER kararlarında bağlayıcıdır");
  });

  it("lets local verbalization prefer the response plan over legacy direct-call fallbacks", () => {
    expect(local).toContain("responsePlan?.continueConversation");
    expect(local).toContain("responsePlan?.allowQuestion");
    expect(local).toContain("responsePlan?.allowHumor");
  });
});
