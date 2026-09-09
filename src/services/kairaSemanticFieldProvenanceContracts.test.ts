import { describe, expect, it } from "vitest";
import { appendSemanticFieldEvidence } from "../types/semanticFieldProvenance";

describe("semantic field provenance sidecar", () => {
  it("tracks target and intent evidence independently", () => {
    let provenance = {};
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
    let provenance = {};
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
});
