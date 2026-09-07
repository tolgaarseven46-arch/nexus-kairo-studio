import fs from "node:fs";
import path from "node:path";
import matrix from "../config/kairaPreAiPhase0Scenarios.json";
import {
  runKairaPreAiPhase0Scenario,
  type KairaPreAiScenarioDefinition,
} from "../src/services/kairaPreAiPhase0Harness";

type ClusterAggregate = {
  scenarioCount: number;
  turnCount: number;
  auditViolationCounts: Record<string, number>;
  declaredFailureClasses: string[];
  scenarios: Array<{
    scenarioId: string;
    title: string;
    turnCount: number;
    auditViolationCounts: Record<string, number>;
    declaredFailureClasses: string[];
    toolingNotes: string[];
  }>;
};

const outArg = process.argv[2] || "artifacts/kaira-preai-phase0-report.json";
const outPath = path.resolve(process.cwd(), outArg);
const runId = process.env.KAIRA_PREAI_RUN_ID || "report";

const scenarioResults = [];
for (const scenario of matrix.scenarios as KairaPreAiScenarioDefinition[]) {
  scenarioResults.push(await runKairaPreAiPhase0Scenario(scenario, runId));
}

const clusters: Record<string, ClusterAggregate> = {};
const globalViolationCounts: Record<string, number> = {};
let totalTurns = 0;
let isolationFailures = 0;
let noAiBoundaryFailures = 0;

for (const result of scenarioResults) {
  totalTurns += result.turns.length;
  const cluster = clusters[result.cluster] ??= {
    scenarioCount: 0,
    turnCount: 0,
    auditViolationCounts: {},
    declaredFailureClasses: [],
    scenarios: [],
  };
  cluster.scenarioCount += 1;
  cluster.turnCount += result.turns.length;

  for (const [code, count] of Object.entries(result.failureClassCounts)) {
    cluster.auditViolationCounts[code] = (cluster.auditViolationCounts[code] ?? 0) + count;
    globalViolationCounts[code] = (globalViolationCounts[code] ?? 0) + count;
  }

  const definition = matrix.scenarios.find((item) => item.scenarioId === result.scenarioId);
  const declaredFailureClasses = definition?.failureClasses ?? [];
  cluster.declaredFailureClasses = Array.from(new Set([...cluster.declaredFailureClasses, ...declaredFailureClasses])).sort();
  cluster.scenarios.push({
    scenarioId: result.scenarioId,
    title: result.title,
    turnCount: result.turns.length,
    auditViolationCounts: result.failureClassCounts,
    declaredFailureClasses,
    toolingNotes: result.toolingNotes,
  });

  for (const turn of result.turns) {
    if (!turn.audit.sessionIsolationCheck.isolated) isolationFailures += 1;
    if (turn.audit.noAiStopMarker !== "FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL") noAiBoundaryFailures += 1;
  }
}

const report = {
  reportType: "KAIRA_PREAI_PHASE0_TOOLING_REPORT",
  version: 1,
  generatedAt: new Date().toISOString(),
  matrixVersion: matrix.version,
  aiBoundary: matrix.aiBoundary,
  branchTrackType: "regression",
  semanticIngress: "deterministic_regex_floor",
  promptCoverage: "production_core_not_yet_byte_identical_server_template",
  summary: {
    scenarioCount: scenarioResults.length,
    turnCount: totalTurns,
    clusterCount: Object.keys(clusters).length,
    isolationFailures,
    noAiBoundaryFailures,
    auditViolationCounts: globalViolationCounts,
  },
  clusters,
  scaleGate: {
    phase1Allowed: false,
    reasons: [
      "Phase 0 machine report must be jointly reviewed by user + ChatGPT + Cloud.",
      "Exact server final-provider-prompt seam is not yet shared with this harness.",
      "This run audits deterministic regex-floor ingestion, not production semantic-provider quality.",
    ],
  },
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Phase 0 report written: ${outPath}`);
