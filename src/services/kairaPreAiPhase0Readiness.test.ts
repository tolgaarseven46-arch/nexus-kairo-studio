import { describe, expect, it } from "vitest";
import { evaluateKairaPreAiScenarioReadiness } from "./kairaPreAiPhase0Readiness";

const observable = [{
  detector: "self_epistemic_provenance",
  totalTurns: 20,
  activeTurns: 1,
  observableTurns: 1,
  unobservableTurns: 19,
  reasons: { typed_snapshot_observed: 1, detector_inactive: 19 },
}];
const missing = [{
  detector: "self_epistemic_provenance",
  totalTurns: 20,
  activeTurns: 0,
  observableTurns: 0,
  unobservableTurns: 20,
  reasons: { typed_self_epistemic_snapshot_missing: 20 },
}];

describe("Phase-0 scenario-complete readiness", () => {
  it("does not unlock a heterogeneous cluster from one observable neighboring scenario", () => {
    const result = evaluateKairaPreAiScenarioReadiness([
      { scenarioId: "A1", cluster: "A", detectorCoverage: observable },
      { scenarioId: "A2", cluster: "A", detectorCoverage: missing },
      { scenarioId: "A3", cluster: "A", detectorCoverage: missing },
    ]);
    expect(result.everyRequiredScenarioObservable).toBe(false);
    expect(result.clusters[0]).toMatchObject({
      cluster: "A",
      ready: false,
      requiredScenarioCount: 3,
      readyRequiredScenarioCount: 1,
    });
  });

  it("allows only explicitly not-applicable negative controls to lack a detector", () => {
    const result = evaluateKairaPreAiScenarioReadiness([
      { scenarioId: "A1", cluster: "A", detectorCoverage: observable },
      { scenarioId: "A4", cluster: "A", expectation: "not_applicable", detectorCoverage: missing },
    ]);
    expect(result.everyRequiredScenarioObservable).toBe(true);
    expect(result.clusters[0].ready).toBe(true);
    expect(result.scenarios.find((item) => item.scenarioId === "A4")).toMatchObject({
      expectation: "not_applicable",
      ready: true,
      hasObservableDetector: false,
    });
  });

  it("keeps observable_required as the default expectation", () => {
    const result = evaluateKairaPreAiScenarioReadiness([
      { scenarioId: "B1", cluster: "B", detectorCoverage: missing },
    ]);
    expect(result.everyRequiredScenarioObservable).toBe(false);
    expect(result.scenarios[0].expectation).toBe("observable_required");
  });
});
