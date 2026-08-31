import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const server = read("server.ts");
const semantic = read("src/services/semanticEventEngine.ts");
const gateway = read("src/services/languageUnderstandingService.ts");
const dialogue = read("src/services/kairoDialogueDecisionEngine.ts");
const local = read("src/services/kairoLocalLanguageEngine.ts");

describe("canonical SemanticEvent consumer authority", () => {
  it("carries social routine, discourse act and explicit advice on the canonical semantic event", () => {
    expect(semantic).toContain("export type SemanticSocialRoutine");
    expect(semantic).toContain("export type SemanticDiscourseAct");
    expect(semantic).toContain("socialRoutine?: SemanticSocialRoutine");
    expect(semantic).toContain("discourseAct?: SemanticDiscourseAct");
    expect(semantic).toContain("adviceRequested?: boolean");
  });

  it("completes optional consumer facets at the language-understanding boundary", () => {
    expect(gateway).toContain('import { canonicalizeSemanticEvent } from "./semanticEventCanonicalizer"');
    expect(gateway.match(/canonicalizeSemanticEvent\(/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("feeds the canonical server event and its single current-turn projection to dialogue planning", () => {
    expect(server).toMatch(/planDialogueResponse\(\s*cleanHistory,\s*userMessage,\s*userName,\s*languageUnderstanding\.event,\s*dialogueAnalysis,\s*\)/u);
    expect(dialogue).toContain("semanticEvent?: SemanticEvent");
    expect(dialogue).not.toContain("const analysis = analyzeDialogueTurn(userMessage)");
  });

  it("feeds the same canonical event to the local verbalizer", () => {
    expect(server).toMatch(/dialogueDecision\.move,\s*responsePlan,\s*languageUnderstanding\.event,\s*kairaPolicy\.persistentUserMemory,\s*\)/u);
    expect(local).toContain("semanticEvent?: SemanticEvent");
    expect(local).toContain("localIntentFromSemanticEvent");
    expect(local).not.toContain("function detectIntent(text:");
  });

  it("keeps fallback parsing centralized in semanticEventEngine", () => {
    expect(dialogue).toContain("interpretSemanticEvent(userMessage)");
    expect(local).toContain("interpretSemanticEvent(message)");
  });
});
