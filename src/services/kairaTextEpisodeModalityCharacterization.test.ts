import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";

const semanticTypes = readFileSync(new URL("../types/semanticInterpretation.ts", import.meta.url), "utf8");
const providerSource = readFileSync(new URL("./llmSemanticUnderstandingProvider.ts", import.meta.url), "utf8");

const baseInterpretation = {
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  raw: "Mert dün geleceğini söyledi ama gelmedi. Acaba yarın gelir mi? Keşke gelse. Bence yine gelmez.",
  normalized: "mert dün geleceğini söyledi ama gelmedi. acaba yarın gelir mi? keşke gelse. bence yine gelmez.",
  primaryIntent: "emotional_share",
  secondarySocialActs: [],
  target: "third_party",
  valence: "negative",
  severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0,
  sincerityConfidence: 0.9,
  affection: 0,
  support: 0,
  compliment: 0,
  emotionalLoad: 0.45,
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
  uncertainty: { overall: 0.2, intent: 0.2, target: 0.1, severity: 0.1 },
  evidence: [{ source: "llm", cues: ["compound narrative"], confidence: 0.9 }],
};

/**
 * Characterization only: these tests intentionally describe the minimum typed
 * contract required before fragmented/compound Discord-style text can safely
 * reach persistent reducers. Production behavior must not be patched until the
 * RED is classified at the owning seam.
 */
describe("text episode + modality characterization", () => {
  it("RED: canonical semantics can represent multiple bounded propositions in one episode", () => {
    expect(semanticTypes).toMatch(/interface\s+SemanticProposition\b/u);
    expect(semanticTypes).toMatch(/propositions\??\s*:\s*SemanticProposition\[\]/u);
  });

  it("RED: every proposition carries typed utterance modality so non-facts cannot become persistent facts", () => {
    expect(semanticTypes).toMatch(/type\s+SemanticModality\s*=\s*[\s\S]*"assertion"[\s\S]*"question"[\s\S]*"hypothetical"[\s\S]*"wish"[\s\S]*"prediction"/u);
    expect(semanticTypes).toMatch(/modality\s*:\s*SemanticModality/u);
  });

  it("RED: proposition contract preserves identity/time/confidence/provenance instead of flattening the episode", () => {
    expect(semanticTypes).toMatch(/interface\s+SemanticProposition[\s\S]*actorId\??\s*:\s*string/u);
    expect(semanticTypes).toMatch(/interface\s+SemanticProposition[\s\S]*temporalAnchor/u);
    expect(semanticTypes).toMatch(/interface\s+SemanticProposition[\s\S]*confidence\s*:\s*number/u);
    expect(semanticTypes).toMatch(/interface\s+SemanticProposition[\s\S]*provenance/u);
  });

  it("RED: canonical normalizer preserves bounded proposition modality at runtime", () => {
    const raw = {
      ...baseInterpretation,
      propositions: [
        { id: "p1", content: "Mert dün geleceğini söyledi", actorId: "person:mert", modality: "assertion", temporalAnchor: "yesterday", confidence: 0.95, provenance: ["current_turn"] },
        { id: "p2", content: "Mert gelmedi", actorId: "person:mert", modality: "assertion", temporalAnchor: "yesterday", confidence: 0.95, provenance: ["current_turn"] },
        { id: "p3", content: "Mert yarın gelir mi", actorId: "person:mert", modality: "question", temporalAnchor: "tomorrow", confidence: 0.98, provenance: ["current_turn"] },
        { id: "p4", content: "Keşke Mert gelse", actorId: "person:mert", modality: "wish", confidence: 0.98, provenance: ["current_turn"] },
        { id: "p5", content: "Bence Mert yine gelmez", actorId: "person:mert", modality: "prediction", confidence: 0.9, provenance: ["current_turn"] },
      ],
    };

    const normalized = normalizeSemanticInterpretation(raw) as unknown as { propositions?: Array<{ modality?: string }> };
    expect(normalized.propositions?.map((item) => item.modality)).toEqual([
      "assertion",
      "assertion",
      "question",
      "wish",
      "prediction",
    ]);
  });

  it("RED: canonical normalizer enforces a hard proposition bound", () => {
    const raw = {
      ...baseInterpretation,
      propositions: Array.from({ length: 24 }, (_, index) => ({
        id: `p${index + 1}`,
        content: `claim ${index + 1}`,
        modality: "assertion",
        confidence: 0.8,
        provenance: ["current_turn"],
      })),
    };
    const normalized = normalizeSemanticInterpretation(raw) as unknown as { propositions?: unknown[] };
    expect(normalized.propositions).toBeDefined();
    expect(normalized.propositions!.length).toBeGreaterThan(0);
    expect(normalized.propositions!.length).toBeLessThanOrEqual(15);
  });

  it("RED: semantic provider contract asks for proposition-level output instead of only one flattened intent", () => {
    expect(providerSource).toContain("propositions");
    expect(providerSource).toContain("modality");
  });
});
