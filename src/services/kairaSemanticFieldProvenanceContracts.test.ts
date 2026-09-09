import { describe, expect, it } from "vitest";
import {
  appendSemanticFieldEvidence,
  type SemanticFieldProvenance,
} from "../types/semanticFieldProvenance";

describe("semantic field provenance sidecar", () => {
  it("tracks target and intent evidence independently", () => {
    let provenance: SemanticFieldProvenance = {};
    provenance = appendSemanticFieldEvidence(provenance, "target", {
      kind: "entity",
      provider: "entity_resolution",
      cues: ["second_person_to_kaira"],
      confidence: 0.95,
    });
    provenance = appendSemanticFieldEvidence(provenance, "primaryIntent", {
      kind: "morphology",
      provider: "fixture",
      cues: ["QUES"],
      confidence: 0.88,
    });

    expect(provenance.target?.[0]?.kind).toBe("entity");
    expect(provenance.primaryIntent?.[0]?.kind).toBe("morphology");
  });

  it("clamps confidence and keeps the bounded latest evidence", () => {
    let provenance: SemanticFieldProvenance = {};
    for (let i = 0; i < 8; i += 1) {
      provenance = appendSemanticFieldEvidence(provenance, "primaryIntent", {
        kind: "reconciliation",
        cues: [`cue-${i}`],
        confidence: i === 7 ? 4 : 0.5,
      });
    }
    expect(provenance.primaryIntent).toHaveLength(6);
    expect(provenance.primaryIntent?.at(-1)?.confidence).toBe(1);
    expect(provenance.primaryIntent?.[0]?.cues).toContain("cue-2");
  });

  it("is immutable and cannot overwrite evidence for another semantic field", () => {
    const original: SemanticFieldProvenance = {
      target: [{
        kind: "entity",
        provider: "entity_resolution",
        cues: ["third_party_grounded"],
        confidence: 0.91,
      }],
    };

    const next = appendSemanticFieldEvidence(original, "primaryIntent", {
      kind: "morphology",
      provider: "fixture",
      cues: ["QUES"],
      confidence: 0.87,
    });

    expect(next).not.toBe(original);
    expect(next.target).toEqual(original.target);
    expect(original.primaryIntent).toBeUndefined();
    expect(next.primaryIntent?.[0]?.cues).toEqual(["QUES"]);
  });

  it("keeps conflicting evidence as provenance instead of resolving semantic truth", () => {
    let provenance: SemanticFieldProvenance = {};
    provenance = appendSemanticFieldEvidence(provenance, "primaryIntent", {
      kind: "morphology",
      provider: "analyzer_a",
      cues: ["QUES"],
      confidence: 0.7,
    });
    provenance = appendSemanticFieldEvidence(provenance, "primaryIntent", {
      kind: "semantic_provider",
      provider: "semantic_shadow",
      cues: ["smalltalk"],
      confidence: 0.72,
    });

    expect(provenance.primaryIntent).toHaveLength(2);
    expect(provenance.primaryIntent?.map((item) => item.kind)).toEqual([
      "morphology",
      "semantic_provider",
    ]);
  });
});
