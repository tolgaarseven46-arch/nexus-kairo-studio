import { describe, expect, it } from "vitest";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import {
  findGeneratedClaimProvenanceIssues,
  UNSUPPORTED_GENERATED_CLAIM_ISSUE,
} from "./kairaGeneratedClaimProvenance";

function interpretation(
  raw: string,
  claims: NonNullable<SemanticInterpretation["worldMemory"]>["claims"],
): SemanticInterpretation {
  return {
    schemaVersion: "semantic-interpretation@2",
    raw,
    normalized: raw,
    primaryIntent: "smalltalk",
    secondarySocialActs: [],
    target: "event",
    valence: "neutral",
    severity: {
      disrespect: 0,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: 0,
    },
    jokingConfidence: 0.7,
    sincerityConfidence: 0.3,
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
    worldMemory: { claims, query: null },
    uncertainty: {
      overall: 0.1,
      intent: 0.1,
      target: 0.1,
      severity: 0.1,
    },
    evidence: [],
  };
}

const plan = {
  requiredContent: ["engage_user_content"],
} as unknown as KairaResponsePlan;

describe("Kaira generated claim provenance", () => {
  it("rejects a Turn 25-style invented claim that is absent from canonical evidence", () => {
    const userTurn = interpretation("yandık ya la", []);
    const reply = interpretation("sen bi şeyler çevirdin ama itiraf etmiyorsun bak", [
      {
        subjectId: "current_user",
        attributeKey: "concealing_action",
        value: true,
        confidence: 0.9,
      },
    ]);

    expect(
      findGeneratedClaimProvenanceIssues({
        plan,
        replyInterpretation: reply,
        evidenceInterpretations: [userTurn],
      }),
    ).toEqual([UNSUPPORTED_GENERATED_CLAIM_ISSUE]);
  });

  it("allows a generated claim when the same canonical claim is grounded in evidence", () => {
    const claim = {
      subjectId: "current_user",
      attributeKey: "back_discomfort",
      value: "ongoing",
      confidence: 0.95,
    };
    const userTurn = interpretation("off sırtım çok pis hala", [claim]);
    const reply = interpretation("sırtın hâlâ rahatsız ediyor", [
      { ...claim, confidence: 0.88 },
    ]);

    expect(
      findGeneratedClaimProvenanceIssues({
        plan,
        replyInterpretation: reply,
        evidenceInterpretations: [userTurn],
      }),
    ).toEqual([]);
  });

  it("does not block pure social wording when reply semantics contain no world claim", () => {
    expect(
      findGeneratedClaimProvenanceIssues({
        plan,
        replyInterpretation: interpretation("harbi yandık", []),
        evidenceInterpretations: [interpretation("yandık ya la", [])],
      }),
    ).toEqual([]);
  });
});
