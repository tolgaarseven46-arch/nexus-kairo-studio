import { describe, expect, it, vi } from "vitest";
import { createLlmSemanticUnderstandingProvider } from "./llmSemanticUnderstandingProvider";
import { kairaMemoryDomainDefinition } from "./kairaMemoryOntology";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

const base = {
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  raw: "x",
  normalized: "x",
  primaryIntent: "question",
  secondarySocialActs: [],
  target: "kaira",
  valence: "neutral",
  severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0,
  sincerityConfidence: 0.8,
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
  worldMemory: { claims: [], query: null },
  uncertainty: { overall: 0.2, intent: 0.2, target: 0.2, severity: 0.2 },
  evidence: [{ source: "llm", cues: [], confidence: 0.8 }],
} as const;

describe("current Kaira self-state vs autobiographical query ontology", () => {
  it("keeps mutable current self truth in self_fact and lived past episodes in autobiography", () => {
    expect(kairaMemoryDomainDefinition("self_fact").kind).toBe("self_truth");
    expect(kairaMemoryDomainDefinition("self_fact").mutability).toBe("evidence_revision");
    expect(kairaMemoryDomainDefinition("autobiographical_memory").kind).toBe("self_truth");
    expect(kairaMemoryDomainDefinition("autobiographical_memory").mutability).toBe("append_only");
  });

  it("binds the semantic provider to the existing current-vs-historical self truth distinction", async () => {
    let capturedSystem = "";
    const generate = vi.fn(async ({ system }: { system: string }) => {
      capturedSystem = system;
      return JSON.stringify(base);
    });
    const provider = createLlmSemanticUnderstandingProvider({ generate });

    await provider.interpret({ message: "Kaira'nın mevcut kişisel durumu nedir?" });

    expect(capturedSystem).toContain("self_fact = Kaira'nın mevcut/şimdiki self gerçeği");
    expect(capturedSystem).toContain("ilişki durumu");
    expect(capturedSystem).toContain("autobiographical_memory = Kaira'nın geçmişte gerçekten yaşadığı olay/anı");
    expect(capturedSystem).toContain("şu anki ilişki durumunu autobiographical_memory yapma");
    expect(capturedSystem).toContain("Geçmişte yaşanmış bir olayı self_fact yapma");
  });
});
