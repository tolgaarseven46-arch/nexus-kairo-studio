import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const server = read("server.ts");
const chaos = read("src/services/kairoDialogueChaosEngine.ts");
const decision = read("src/services/kairoDialogueDecisionEngine.ts");

describe("canonical current-turn dialogue authority", () => {
  it("projects current dialogue analysis from canonical SemanticEvent once in chat runtime", () => {
    expect(server).toContain("projectSemanticEventToDialogueAnalysis(languageUnderstanding.event)");
    expect(server).not.toContain("const dialogueAnalysis = analyzeDialogueTurn(userMessage)");
  });

  it("passes the same current projection to board and decision planning", () => {
    expect(server).toMatch(/buildDialogueBoardInstruction\(\s*cleanHistory,\s*userMessage,\s*userName,\s*dialogueAnalysis,\s*\)/u);
    expect(server).toMatch(/planDialogueResponse\(\s*cleanHistory,\s*userMessage,\s*userName,\s*languageUnderstanding\.event,\s*dialogueAnalysis,\s*discourseState,\s*\)/u);
  });

  it("passes the same projection through every server attribution gate", () => {
    const attributionCalls = server.match(/findDialogueAttributionIssues\([\s\S]*?\),/gu) ?? [];
    expect(attributionCalls.length).toBeGreaterThanOrEqual(4);
    for (const call of attributionCalls) {
      expect(call).toContain("dialogueAnalysis");
    }
  });

  it("lets claim ledger and attribution consume a supplied current analysis", () => {
    expect(chaos).toContain("currentAnalysis?: DialogueTurnAnalysis");
    expect(chaos).toContain("const analysis = turn.analysis ?? analyzeDialogueTurn(turn.text)");
    expect(chaos).toContain("buildDialogueClaimLedger(history, userMessage, userName, currentAnalysis)");
  });

  it("keeps legacy parsing only as a historical/direct-call fallback", () => {
    expect(chaos).toContain("analysis: currentAnalysis ?? analyzeDialogueTurn(userMessage)");
    expect(decision).toContain("currentAnalysis ?? projectSemanticEventToDialogueAnalysis(event)");
  });
});
