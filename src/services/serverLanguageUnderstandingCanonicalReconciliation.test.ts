import { describe, expect, it } from "vitest";
import { resolveMessageEntities } from "./entityResolutionEngine";
import { reconcileServerCanonicalSemantics } from "./serverLanguageUnderstanding";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

const interpretationBase = {
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  raw: "x",
  normalized: "x",
  primaryIntent: "information_request",
  secondarySocialActs: [],
  target: "unknown",
  valence: "neutral",
  severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0,
  sincerityConfidence: 0.8,
  affection: 0,
  support: 0,
  compliment: 0,
  emotionalLoad: 0.1,
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
  propositions: [{ id: "p1", content: "x", modality: "assertion", confidence: 0.9, provenance: ["current_turn"] }],
  worldMemory: { claims: [], query: null },
  uncertainty: { overall: 0.2, intent: 0.2, target: 0.2, severity: 0.2 },
  evidence: [{ source: "llm", provider: "semantic-parser", cues: [], confidence: 0.8 }],
} as const;

function resultFor(message: string, interpretation: any): any {
  return {
    interpretation,
    event: {},
    entityResolution: resolveMessageEntities(message),
    worldEvent: {},
    semanticSource: "semantic_provider",
    semanticProvider: "llm_semantic_runtime",
    warnings: [],
  };
}

describe("server canonical semantic reconciliation", () => {
  it("normalizes world-memory self alias to current_user before downstream use", () => {
    const message = "yok karar verdim, istifa etmeyeceğim";
    const result = reconcileServerCanonicalSemantics(message, resultFor(message, {
      ...interpretationBase,
      raw: message,
      normalized: message,
      worldMemory: {
        claims: [{ subjectId: "self", attributeKey: "will_resign", value: false, confidence: 0.9 }],
        query: null,
      },
    }));

    expect(result.interpretation.worldMemory.claims).toEqual([
      { subjectId: "current_user", attributeKey: "will_resign", value: false, confidence: 0.9 },
    ]);
    expect(result.interpretation.evidence.at(-1)?.cues).toContain("world_memory_self_alias_to_current_user");
  });

  it("removes recall_request from declarative reported speech without retrieval evidence", () => {
    const message = "Ali bana Mert'in bunu dediğini söyledi";
    const result = reconcileServerCanonicalSemantics(message, resultFor(message, {
      ...interpretationBase,
      raw: message,
      normalized: message,
      target: "third_party",
      discourseFacets: { ...interpretationBase.discourseFacets, discourseAct: "recall_request" },
      propositions: [{ id: "p1", content: "Ali bir sözü aktardı", modality: "assertion", confidence: 0.8, provenance: ["current_turn"] }],
    }));

    expect(result.interpretation.discourseFacets.discourseAct).toBe("none");
    expect(result.event.discourseAct).toBe("none");
    expect(result.interpretation.evidence.at(-1)?.cues).toContain("recall_request_requires_retrieval_evidence");
  });

  it("preserves recall_request when a real retrieval question exists", () => {
    const message = "Mert ne demişti?";
    const original = resultFor(message, {
      ...interpretationBase,
      raw: message,
      normalized: message,
      primaryIntent: "question",
      discourseFacets: { ...interpretationBase.discourseFacets, discourseAct: "recall_request" },
      propositions: [{ id: "p1", content: "Mert ne demişti?", modality: "question", confidence: 0.95, provenance: ["current_turn"] }],
    });
    const result = reconcileServerCanonicalSemantics(message, original);

    expect(result).toBe(original);
    expect(result.interpretation.discourseFacets.discourseAct).toBe("recall_request");
  });
});
