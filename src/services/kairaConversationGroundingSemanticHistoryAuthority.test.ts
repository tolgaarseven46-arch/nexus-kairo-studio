import { describe, expect, it } from "vitest";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import { buildKairoGroundingInstruction } from "./kairoConversationGrounding";

function semanticSnapshot(
  raw: string,
  uncertaintyOverall: number,
): SemanticInterpretation {
  return {
    schemaVersion: "semantic-interpretation@2",
    raw,
    normalized: raw.toLocaleLowerCase("tr-TR"),
    primaryIntent: "smalltalk",
    secondarySocialActs: [],
    target: "unknown",
    valence: "neutral",
    severity: {
      disrespect: 0,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: 0,
    },
    jokingConfidence: 0,
    sincerityConfidence: 1,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0,
    apology: false,
    repairAttempt: false,
    stopRequest: false,
    discourseFacets: {
      socialRoutine: "none",
      discourseAct: "none",
      repairSignal: "none",
      adviceRequested: false,
      knowledgeQuery: null,
      selfMemoryQuery: null,
      relationalAct: "none",
      relationalIntensity: 0,
      stopQuestions: false,
      stopTalking: false,
    },
    uncertainty: {
      overall: uncertaintyOverall,
      intent: uncertaintyOverall,
      target: 0,
      severity: 0,
    },
    evidence: [
      {
        source: "reconciled",
        cues: ["persisted_test_snapshot"],
        confidence: 1,
      },
    ],
  };
}

describe("conversation grounding historical semantic authority", () => {
  it("does not reconstruct historical uncertainty from raw text when the persisted semantic snapshot says it is absent", () => {
    const historicalText = "Mert yarın istifa etmeyi düşünüyorum dedi.";
    const history = [
      {
        sender: "user",
        text: historicalText,
        semanticInterpretation: semanticSnapshot(historicalText, 0),
      },
    ];

    const instruction = buildKairoGroundingInstruction(
      history,
      "Mert ne yapacaktı?",
    );

    expect(instruction).not.toContain(`- ${historicalText}`);
  });

  it("preserves historical uncertain evidence when the persisted semantic snapshot marks it uncertain", () => {
    const historicalText = "Mert yarın istifa etmeyi düşünüyorum dedi.";
    const history = [
      {
        sender: "user",
        text: historicalText,
        semanticInterpretation: semanticSnapshot(historicalText, 0.75),
      },
    ];

    const instruction = buildKairoGroundingInstruction(
      history,
      "Mert ne yapacaktı?",
    );

    expect(instruction).toContain(`- ${historicalText}`);
  });
});
