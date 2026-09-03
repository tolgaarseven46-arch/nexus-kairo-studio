import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { deriveDiscourseState } from "./discourseStateReducer";
import type { SemanticEvent } from "./semanticEventEngine";

const event = (raw: string, intent: SemanticEvent["intent"]): SemanticEvent => ({
  raw, normalized: raw.toLocaleLowerCase("tr-TR"), intent, socialRoutine: "none", discourseAct: "none", repairSignal: "none", adviceRequested: false, knowledgeQuery: null, valence: "neutral", target: "unknown", relationalAct: "none", relationalIntensity: 0, severity: 0, insult: false, redLine: false, disrespect: 0, coercion: 0, manipulation: 0, privacyViolation: 0, apology: false, repairAttempt: false, stopQuestions: false, stopTalking: false, frustration: 0, emotionalLoad: 0, affection: 0, support: 0, compliment: 0,
});

describe("canonical historical semantic authority", () => {
  it("consumes the persisted semantic event instead of reparsing historical text", () => {
    const state = deriveDiscourseState([{ sender: "user", text: "neyi anladın", semanticEvent: event("neyi anladın", "question") }]);
    expect(state.lastUserAct).toBe("question");
  });

  it("fails closed when an old historical user turn has no canonical semantic snapshot", () => {
    const state = deriveDiscourseState([{ sender: "user", text: "naber" }]);
    expect(state.turnIndex).toBe(0);
    expect(state.lastUserAct).toBeNull();
  });

  it("structurally forbids historical regex reparse and wires snapshot transport + persistence", () => {
    const discourse = readFileSync("src/services/discourseStateReducer.ts", "utf8");
    const chat = readFileSync("src/services/droitChatService.ts", "utf8");
    const persistence = readFileSync("src/services/kdmPersistenceService.ts", "utf8");
    const server = readFileSync("server.ts", "utf8");
    expect(discourse).not.toContain("interpretSemanticEvent(text)");
    expect(discourse).toContain("event: raw.semanticEvent");
    expect(chat).toContain("semanticEvent: m.semanticEvent");
    expect(persistence).toContain("semanticEvent: turn.metadata?.semanticEvent");
    expect((server.match(/semanticEvent: canonicalSemantic\.event/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
