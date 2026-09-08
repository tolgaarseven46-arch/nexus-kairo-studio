export type KairaPreAiDetectorExpectation = "observable_required" | "not_applicable";

export interface KairaPreAiDetectorCoverageRow {
  detector: string;
  totalTurns: number;
  activeTurns: number;
  observableTurns: number;
  unobservableTurns: number;
  reasons: Record<string, number>;
}

export interface KairaPreAiScenarioReadinessInput {
  scenarioId: string;
  cluster: string;
  expectation?: KairaPreAiDetectorExpectation;
  detectorCoverage: KairaPreAiDetectorCoverageRow[];
}

export interface KairaPreAiScenarioReadiness {
  scenarioId: string;
  cluster: string;
  expectation: KairaPreAiDetectorExpectation;
  hasObservableDetector: boolean;
  ready: boolean;
  detectorCoverage: KairaPreAiDetectorCoverageRow[];
}

export interface KairaPreAiClusterReadiness {
  cluster: string;
  ready: boolean;
  requiredScenarioCount: number;
  readyRequiredScenarioCount: number;
  scenarios: KairaPreAiScenarioReadiness[];
}

/**
 * Phase-0 scaling is scenario-complete, not cluster-sampled. A heterogeneous
 * cluster must not become ready merely because one neighboring scenario has a
 * typed observable detector. Negative controls are exempt only when the tooling
 * policy marks them explicitly `not_applicable`.
 */
export function evaluateKairaPreAiScenarioReadiness(
  inputs: KairaPreAiScenarioReadinessInput[],
): {
  scenarios: KairaPreAiScenarioReadiness[];
  clusters: KairaPreAiClusterReadiness[];
  everyRequiredScenarioObservable: boolean;
} {
  const scenarios = inputs.map((input) => {
    const expectation = input.expectation ?? "observable_required";
    const hasObservableDetector = input.detectorCoverage.some((row) => row.observableTurns > 0);
    return {
      scenarioId: input.scenarioId,
      cluster: input.cluster,
      expectation,
      hasObservableDetector,
      ready: expectation === "not_applicable" || hasObservableDetector,
      detectorCoverage: input.detectorCoverage,
    };
  });

  const clusterIds = Array.from(new Set(scenarios.map((item) => item.cluster))).sort();
  const clusters = clusterIds.map((cluster) => {
    const rows = scenarios.filter((item) => item.cluster === cluster);
    const required = rows.filter((item) => item.expectation === "observable_required");
    return {
      cluster,
      ready: rows.length > 0 && rows.every((item) => item.ready),
      requiredScenarioCount: required.length,
      readyRequiredScenarioCount: required.filter((item) => item.ready).length,
      scenarios: rows,
    };
  });

  const required = scenarios.filter((item) => item.expectation === "observable_required");
  return {
    scenarios,
    clusters,
    everyRequiredScenarioObservable:
      required.length > 0 && required.every((item) => item.hasObservableDetector),
  };
}
