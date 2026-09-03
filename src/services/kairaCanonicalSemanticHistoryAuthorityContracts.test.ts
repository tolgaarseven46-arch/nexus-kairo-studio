import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { deriveDiscourseState } from "./discourseStateReducer";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import type { SemanticInterpretation, SemanticPrimaryIntent } from "../types/semanticInterpretation";

const interpretation = (raw: string, primaryIntent: SemanticPrimaryIntent): SemanticInterpretation => ({
  ...interpretationFromRegexFloor(raw),
  primaryIntent,
  discourseFacets: {
    ...interpretationFromRegexFloor(raw).discourseFacets,
    socialRoutine: "none",
    discourseAct: "none",
    repairSignal: "none",
  },
});

describe("canonical historical semantic authority", () => {
  it("consumes persisted SemanticInterpretation@2 instead of reparsing historical text", () => {
    const state = deriveDiscourseState([
      { sender: "user", text: "neyi anladın", semanticInterpretation: interpretation("neyi anladın", "question") },
    ]);
    expect(state.lastUserAct).toBe("question");
  });

  it("fails closed when an old historical user turn has no canonical semantic snapshot", () => {
    const state = deriveDiscourseState([{ sender: "user", text: "naber" }]);
    expect(state.turnIndex).toBe(0);
    expect(state.lastUserAct).toBeNull();
  });

  it("structurally forbids historical reparse and wires v2 snapshot transport + persistence", () => {
    const discourse = readFileSync("src/services/discourseStateReducer.ts", "utf8");
    const chat = readFileSync("src/services/droitChatService.ts", "utf8");
    const persistence = readFileSync("src/services/kdmPersistenceService.ts", "utf8");
    const server = readFileSync("server.ts", "utf8");
    const projection = readFileSync("src/services/semanticInterpretationProjection.ts", "utf8");

    expect(discourse).not.toContain("interpretSemanticEvent(text)");
    expect(discourse).toContain("projectSemanticEvent(raw.semanticInterpretation)");
    expect(chat).toContain("semanticInterpretation: m.semanticInterpretation");
    expect(persistence).toContain("semanticInterpretation: turn.metadata?.semanticInterpretation");
    expect(server).toContain("semanticInterpretation: canonicalSemantic.interpretation");
    expect(projection).not.toMatch(/interpretSemanticEvent|interpretationFromRegexFloor|RegExp/u);
  });
});
