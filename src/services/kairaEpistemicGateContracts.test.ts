import { describe, expect, it } from "vitest";
import { evaluateKairaKnowledge } from "./kairaEpistemicGate";
import type { KairaKnowledgeProfile } from "./kairaKnowledgeProfile";
import { validateKairaKnowledgeProfile } from "./kairaKnowledgeProfile";

const bounded: KairaKnowledgeProfile = {
  kairaInstanceId: "kaira_knowledge_01",
  schemaVersion: 1,
  coverage: "bounded_catalog",
  concepts: [
    {
      id: "concept_krizantem",
      label: "krizantem",
      provenance: "inherited",
      confidence: 1,
    },
    {
      id: "concept_siginak",
      label: "sığınak",
      provenance: "learned",
      confidence: 0.55,
    },
  ],
};

describe("Kaira epistemic gate contracts", () => {
  it("accepts a valid bounded knowledge profile", () => {
    expect(validateKairaKnowledgeProfile(bounded)).toEqual([]);
  });

  it("returns known for an explicitly known concept", () => {
    expect(
      evaluateKairaKnowledge(
        { kairaInstanceId: bounded.kairaInstanceId, surface: "Krizantem" },
        bounded,
      ),
    ).toEqual({ status: "known", source: "instance_knowledge", confidence: 1 });
  });

  it("keeps low-confidence learned knowledge partial", () => {
    expect(
      evaluateKairaKnowledge(
        { kairaInstanceId: bounded.kairaInstanceId, conceptId: "concept_siginak" },
        bounded,
      ),
    ).toEqual({ status: "partial", source: "learned", confidence: 0.55 });
  });

  it("may infer unknown from absence only for a bounded catalogue", () => {
    expect(
      evaluateKairaKnowledge(
        { kairaInstanceId: bounded.kairaInstanceId, surface: "opera" },
        bounded,
      ).status,
    ).toBe("unknown");

    expect(
      evaluateKairaKnowledge(
        { kairaInstanceId: bounded.kairaInstanceId, surface: "opera" },
        { ...bounded, coverage: "open_model_fallback" },
      ).source,
    ).toBe("legacy_allow_all");
  });

  it("does not apply another instance's knowledge profile", () => {
    expect(
      evaluateKairaKnowledge(
        { kairaInstanceId: "different_kaira", surface: "opera" },
        bounded,
      ),
    ).toEqual({ status: "known", source: "legacy_allow_all", confidence: 1 });
  });
});
