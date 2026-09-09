import { describe, expect, it } from "vitest";
import {
  assessMorphologyCandidate,
  benchmarkTurkishMorphologyEvidence,
  type MorphologyBenchmarkCase,
} from "./turkishMorphologyShadowBenchmark";
import type { TurkishMorphologyEvidence } from "../types/turkishLinguisticEvidence";

const cases: MorphologyBenchmarkCase[] = [
  { id: "neg", text: "özür dilemiyorum", expectations: [{ surface: "dilemiyorum", requiredAllTags: ["NEG", "PROG1", "A1SG"] }] },
  { id: "dat", text: "arkadaşına", expectations: [{ surface: "arkadaşına", requiredAnyTags: ["DAT"] }] },
  { id: "ins", text: "seninle", expectations: [{ surface: "seninle", requiredAllTags: ["A2SG", "INS"] }] },
  { id: "loc", text: "sende", expectations: [{ surface: "sende", requiredAllTags: ["A2SG", "LOC"], expectAmbiguous: true }] },
  { id: "question", text: "mi", expectations: [{ surface: "mi", requiredAnyTags: ["QUES"], expectAmbiguous: true }] },
  { id: "where", text: "neredeydin", expectations: [{ surface: "neredeydin", requiredAllTags: ["LOC", "PAST", "A2SG"] }] },
  { id: "past", text: "yaptın", expectations: [{ surface: "yaptın", requiredAllTags: ["PAST", "A2SG"] }] },
  { id: "future", text: "yapacaksın", expectations: [{ surface: "yapacaksın", requiredAllTags: ["FUT", "A2SG"] }] },
  { id: "who_with", text: "kimlerle", expectations: [{ surface: "kimlerle", allowZeroParse: true }] },
];

const one = (provider: string, surface: string, morphemes: string[], analyses = 1): TurkishMorphologyEvidence => ({
  provider,
  normalizedText: surface,
  tokens: [{
    surface,
    analyses: Array.from({ length: analyses }, (_, index) => ({
      lemma: surface,
      pos: index === 0 ? "VERB" : "ALT",
      morphemes,
    })),
  }],
});

const frozenJsProof: Record<string, TurkishMorphologyEvidence> = {
  neg: one("nlptoolkit-frozen-proof", "dilemiyorum", ["NEG", "PROG1", "A1SG"]),
  dat: one("nlptoolkit-frozen-proof", "arkadaşına", ["P2SG", "P3SG", "DAT"], 2),
  ins: one("nlptoolkit-frozen-proof", "seninle", ["A2SG", "INS"]),
  loc: one("nlptoolkit-frozen-proof", "sende", ["A2SG", "LOC"], 2),
  question: one("nlptoolkit-frozen-proof", "mi", ["QUES"], 2),
  where: one("nlptoolkit-frozen-proof", "neredeydin", ["LOC", "PAST", "A2SG"]),
  past: one("nlptoolkit-frozen-proof", "yaptın", ["PAST", "A2SG"]),
  future: one("nlptoolkit-frozen-proof", "yapacaksın", ["FUT", "A2SG"]),
  who_with: { provider: "nlptoolkit-frozen-proof", normalizedText: "kimlerle", tokens: [{ surface: "kimlerle", analyses: [] }] },
};

describe("provider-neutral Turkish morphology shadow benchmark", () => {
  it("scores frozen JS proof without pretending zero-parse is success coverage", () => {
    const result = benchmarkTurkishMorphologyEvidence(cases, frozenJsProof);
    expect(result.caseCount).toBe(9);
    expect(result.zeroParseCount).toBe(1);
    expect(result.parseRate).toBeCloseTo(8 / 9);
    expect(result.expectedFeatureRecall).toBe(1);
    expect(result.ambiguityRate).toBeGreaterThan(0);
  });

  it("keeps JS analyzer in shadow status until its dependency and coverage are accepted", () => {
    const benchmark = benchmarkTurkishMorphologyEvidence(cases, frozenJsProof);
    const assessment = assessMorphologyCandidate(benchmark, {
      provider: "nlptoolkit-morphologicalanalysis@1.0.20",
      executionBoundary: "in_process",
      requestGranularity: "sentence",
      retainsCompetingAnalyses: true,
      sentenceDisambiguation: false,
      dependencyAcceptedForProduction: false,
    });
    expect(assessment.recommendation).toBe("shadow_candidate");
    expect(assessment.blockers).toContain("zero_parse_present");
    expect(assessment.blockers).toContain("production_dependency_not_accepted");
  });

  it("classifies the legacy per-token lemma wrapper as compatibility-only", () => {
    const benchmark = benchmarkTurkishMorphologyEvidence(cases, {});
    const assessment = assessMorphologyCandidate(benchmark, {
      provider: "legacy-zemberek-lemmas",
      executionBoundary: "local_service",
      requestGranularity: "token",
      retainsCompetingAnalyses: false,
      sentenceDisambiguation: false,
      dependencyAcceptedForProduction: true,
    });
    expect(assessment.recommendation).toBe("compatibility_only");
    expect(assessment.blockers).toContain("per_token_remote_boundary");
    expect(assessment.blockers).toContain("ambiguity_information_lost");
  });

  it("keeps rich Zemberek sentence analysis as a reference candidate until measured evidence exists", () => {
    const benchmark = benchmarkTurkishMorphologyEvidence(cases, {});
    const assessment = assessMorphologyCandidate(benchmark, {
      provider: "zemberek-sentence-analysis-unmeasured",
      executionBoundary: "local_service",
      requestGranularity: "sentence",
      retainsCompetingAnalyses: true,
      sentenceDisambiguation: true,
      dependencyAcceptedForProduction: false,
    });
    expect(assessment.recommendation).toBe("reference_candidate");
    expect(assessment.blockers).toContain("production_dependency_not_accepted");
  });
});
