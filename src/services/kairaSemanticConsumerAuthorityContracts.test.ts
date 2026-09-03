import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const server = read("server.ts");
const semanticV2 = read("src/types/semanticInterpretation.ts");
const gateway = read("src/services/languageUnderstandingService.ts");
const projection = read("src/services/semanticInterpretationProjection.ts");
const dialogue = read("src/services/kairoDialogueDecisionEngine.ts");
const local = read("src/services/kairoLocalLanguageEngine.ts");

describe("canonical SemanticInterpretation@2 consumer authority", () => {
  it("owns discourse-facing facets on the canonical v2 interpretation", () => {
    expect(semanticV2).toContain("export interface SemanticDiscourseFacets");
    expect(semanticV2).toContain("socialRoutine: SemanticSocialRoutine");
    expect(semanticV2).toContain("discourseAct: SemanticDiscourseAct");
    expect(semanticV2).toContain("repairSignal: SemanticRepairSignal");
    expect(semanticV2).toContain("adviceRequested: boolean");
    expect(semanticV2).toContain("knowledgeQuery: SemanticKnowledgeQuery | null");
    expect(semanticV2).toContain("selfMemoryQuery: SemanticSelfMemoryQuery | null");
  });

  it("projects consumer compatibility fields only from canonical v2 at the language boundary", () => {
    expect(gateway).toContain('import { projectSemanticEvent } from "./semanticInterpretationProjection"');
    expect(gateway).toContain("interpretation: SemanticInterpretation");
    expect(gateway).toContain("const projected = projectSemanticEvent(interpretation)");
    expect(gateway).not.toContain("canonicalizeSemanticEvent");
    expect(gateway).not.toContain("incomingSemanticEvent");
    expect(projection).not.toMatch(/interpretSemanticEvent|interpretationFromRegexFloor|RegExp/u);
  });

  it("feeds the single current-turn compatibility projection to dialogue planning", () => {
    expect(server).toMatch(/planDialogueResponse\(\s*cleanHistory,\s*userMessage,\s*userName,\s*languageUnderstanding\.event,\s*dialogueAnalysis,\s*discourseState,\s*\)/u);
    expect(dialogue).toContain("semanticEvent?: SemanticEvent");
    expect(dialogue).not.toContain("const analysis = analyzeDialogueTurn(userMessage)");
  });

  it("feeds the same compatibility projection to the local verbalizer", () => {
    expect(server).toMatch(/dialogueDecision\.move,\s*responsePlan,\s*languageUnderstanding\.event,\s*kairaPolicy\.persistentUserMemory,\s*discourseState,\s*\)/u);
    expect(local).toContain("semanticEvent?: SemanticEvent");
    expect(local).toContain("trivialRenderIntent");
    expect(local).not.toContain("function detectIntent(text:");
  });

  it("keeps parsing centralized at ingestion and forbids local reparse", () => {
    // Compatibility consumers may still accept a SemanticEvent projection, but
    // the local renderer never reconstructs semantic truth from raw text.
    expect(local).not.toMatch(/\binterpretSemanticEvent\s*\(/u);
    expect(gateway).toContain("interpretationFromRegexFloor(message)");
    expect(gateway).toContain('semanticSource: "fallback_regex"');
  });
});
