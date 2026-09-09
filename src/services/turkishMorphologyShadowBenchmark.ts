import type { TurkishMorphologyEvidence } from "../types/turkishLinguisticEvidence";

export interface MorphologyBenchmarkExpectation {
  surface: string;
  requiredAnyTags?: string[];
  requiredAllTags?: string[];
  allowZeroParse?: boolean;
  expectAmbiguous?: boolean;
}

export interface MorphologyBenchmarkCase {
  id: string;
  text: string;
  expectations: MorphologyBenchmarkExpectation[];
}

export interface MorphologyBenchmarkCaseResult {
  id: string;
  tokenCount: number;
  parsedTokenCount: number;
  zeroParseCount: number;
  ambiguousTokenCount: number;
  expectationCount: number;
  expectationPassCount: number;
}

export interface MorphologyBenchmarkResult {
  provider: string;
  caseCount: number;
  tokenCount: number;
  parsedTokenCount: number;
  zeroParseCount: number;
  ambiguousTokenCount: number;
  expectationCount: number;
  expectationPassCount: number;
  parseRate: number;
  zeroParseRate: number;
  ambiguityRate: number;
  expectedFeatureRecall: number;
  cases: MorphologyBenchmarkCaseResult[];
}

const ratio = (n: number, d: number): number => d === 0 ? 0 : n / d;
const norm = (value: string): string => value.toLocaleLowerCase("tr-TR");

function tokenMatchesExpectation(
  evidence: TurkishMorphologyEvidence,
  expectation: MorphologyBenchmarkExpectation,
): boolean {
  const token = evidence.tokens.find((item) => norm(item.surface) === norm(expectation.surface));
  if (!token) return false;

  if (token.analyses.length === 0) return expectation.allowZeroParse === true;
  if (expectation.expectAmbiguous === true && token.analyses.length < 2) return false;
  if (expectation.expectAmbiguous === false && token.analyses.length !== 1) return false;

  const allObservedTags = new Set(token.analyses.flatMap((analysis) => analysis.morphemes));
  const requiredAllTags = expectation.requiredAllTags ?? [];
  const requiredAnyTags = expectation.requiredAnyTags ?? [];

  if (!requiredAllTags.every((tag) => allObservedTags.has(tag))) return false;
  if (requiredAnyTags.length > 0 && !requiredAnyTags.some((tag) => allObservedTags.has(tag))) return false;
  return true;
}

export function benchmarkTurkishMorphologyEvidence(
  cases: MorphologyBenchmarkCase[],
  evidenceByCase: Record<string, TurkishMorphologyEvidence>,
): MorphologyBenchmarkResult {
  const caseResults: MorphologyBenchmarkCaseResult[] = cases.map((testCase) => {
    const evidence = evidenceByCase[testCase.id];
    if (!evidence) {
      return {
        id: testCase.id,
        tokenCount: 0,
        parsedTokenCount: 0,
        zeroParseCount: 0,
        ambiguousTokenCount: 0,
        expectationCount: testCase.expectations.length,
        expectationPassCount: 0,
      };
    }

    const tokenCount = evidence.tokens.length;
    const parsedTokenCount = evidence.tokens.filter((token) => token.analyses.length > 0).length;
    const zeroParseCount = evidence.tokens.filter((token) => token.analyses.length === 0).length;
    const ambiguousTokenCount = evidence.tokens.filter((token) => token.analyses.length > 1).length;
    const expectationPassCount = testCase.expectations.filter((expectation) =>
      tokenMatchesExpectation(evidence, expectation)
    ).length;

    return {
      id: testCase.id,
      tokenCount,
      parsedTokenCount,
      zeroParseCount,
      ambiguousTokenCount,
      expectationCount: testCase.expectations.length,
      expectationPassCount,
    };
  });

  const firstEvidence = cases.map((c) => evidenceByCase[c.id]).find(Boolean);
  const tokenCount = caseResults.reduce((sum, item) => sum + item.tokenCount, 0);
  const parsedTokenCount = caseResults.reduce((sum, item) => sum + item.parsedTokenCount, 0);
  const zeroParseCount = caseResults.reduce((sum, item) => sum + item.zeroParseCount, 0);
  const ambiguousTokenCount = caseResults.reduce((sum, item) => sum + item.ambiguousTokenCount, 0);
  const expectationCount = caseResults.reduce((sum, item) => sum + item.expectationCount, 0);
  const expectationPassCount = caseResults.reduce((sum, item) => sum + item.expectationPassCount, 0);

  return {
    provider: firstEvidence?.provider ?? "missing",
    caseCount: cases.length,
    tokenCount,
    parsedTokenCount,
    zeroParseCount,
    ambiguousTokenCount,
    expectationCount,
    expectationPassCount,
    parseRate: ratio(parsedTokenCount, tokenCount),
    zeroParseRate: ratio(zeroParseCount, tokenCount),
    ambiguityRate: ratio(ambiguousTokenCount, tokenCount),
    expectedFeatureRecall: ratio(expectationPassCount, expectationCount),
    cases: caseResults,
  };
}

export interface MorphologyProviderOperationalProfile {
  provider: string;
  executionBoundary: "in_process" | "local_service" | "network_service" | "unknown";
  requestGranularity: "token" | "sentence" | "unknown";
  retainsCompetingAnalyses: boolean;
  sentenceDisambiguation: boolean;
  dependencyAcceptedForProduction: boolean;
}

export interface MorphologyCandidateAssessment {
  benchmark: MorphologyBenchmarkResult;
  operations: MorphologyProviderOperationalProfile;
  blockers: string[];
  recommendation: "compatibility_only" | "shadow_candidate" | "reference_candidate" | "production_candidate";
}

export function assessMorphologyCandidate(
  benchmark: MorphologyBenchmarkResult,
  operations: MorphologyProviderOperationalProfile,
): MorphologyCandidateAssessment {
  const blockers: string[] = [];
  if (benchmark.zeroParseRate > 0) blockers.push("zero_parse_present");
  if (benchmark.expectedFeatureRecall < 1) blockers.push("expected_feature_gap");
  if (operations.requestGranularity === "token" && operations.executionBoundary !== "in_process") {
    blockers.push("per_token_remote_boundary");
  }
  if (!operations.retainsCompetingAnalyses) blockers.push("ambiguity_information_lost");
  if (!operations.dependencyAcceptedForProduction) blockers.push("production_dependency_not_accepted");

  let recommendation: MorphologyCandidateAssessment["recommendation"] = "production_candidate";
  if (operations.requestGranularity === "token" && !operations.retainsCompetingAnalyses) {
    recommendation = "compatibility_only";
  } else if (!operations.dependencyAcceptedForProduction) {
    recommendation = operations.sentenceDisambiguation ? "reference_candidate" : "shadow_candidate";
  }

  return { benchmark, operations, blockers, recommendation };
}
