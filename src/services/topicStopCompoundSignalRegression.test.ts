import { describe, expect, it, vi } from "vitest";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import { createLlmSemanticUnderstandingProvider } from "./llmSemanticUnderstandingProvider";

function base(overrides: Partial<SemanticInterpretation> = {}): SemanticInterpretation {
  return {
    schemaVersion: "semantic-interpretation@2", raw: "x", normalized: "x", primaryIntent: "other", secondarySocialActs: [], target: "unknown", valence: "neutral",
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 }, jokingConfidence: 0, sincerityConfidence: 0.9, affection: 0, support: 0, compliment: 0, emotionalLoad: 0, apology: false, repairAttempt: false, stopRequest: false,
    discourseFacets: { socialRoutine: "none", discourseAct: "none", repairSignal: "none", adviceRequested: false, knowledgeQuery: null, selfMemoryQuery: null, relationalAct: "none", relationalIntensity: 0, stopQuestions: false, stopTalking: false },
    uncertainty: { overall: 0.2, intent: 0.2, target: 0.2, severity: 0.2 }, evidence: [], ...overrides,
  };
}

describe("compound topic/full-stop regression", () => {
  it("allows topic_shift and stopTalking to coexist when the user explicitly asks for both", async () => {
    const generated = base({ raw: "bu konuyu da kapat konuşmayı da bitir", normalized: "bu konuyu da kapat konuşmayı da bitir", primaryIntent: "command", target: "kaira", secondarySocialActs: ["stop_request"], stopRequest: true, discourseFacets: { socialRoutine: "none", discourseAct: "topic_shift", repairSignal: "none", adviceRequested: false, knowledgeQuery: null, selfMemoryQuery: null, relationalAct: "none", relationalIntensity: 0.3, stopQuestions: false, stopTalking: true } });
    const generate = vi.fn().mockResolvedValue(JSON.stringify(generated));
    const result = await createLlmSemanticUnderstandingProvider({ generate }).interpret({ message: generated.raw });
    expect(result.discourseFacets.discourseAct).toBe("topic_shift");
    expect(result.discourseFacets.stopTalking).toBe(true);
    expect(result.stopRequest).toBe(true);
    expect(result.secondarySocialActs).toContain("stop_request");
  });
});
