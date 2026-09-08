import fs from "node:fs";
import path from "node:path";
import matrix from "../config/kairaPreAiPhase0Scenarios.json";
import {
  runKairaPreAiPhase0Scenario,
  type KairaPreAiScenarioDefinition,
} from "../src/services/kairaPreAiPhase0Harness";

type ViolationDetail = {
  scenarioId: string;
  cluster: string;
  turnNumber: number;
  userMessage: string;
  semanticSource: string;
  violationCodes: string[];
  violationMessages: string[];
  responsePlan: {
    allowQuestion: boolean;
    allowAffection: boolean;
    allowAdvice: boolean;
    requiredContent: string[];
    hardReasons: string[];
    maxWords: number;
    maxSentences: number;
  };
  dialogueDecision: {
    move?: string;
    target?: string;
    reason?: string;
    obligationType?: string | null;
    allowedResolutions?: string[];
  };
  promptExcerpt: string;
};

type DetectorCoverageAggregate = {
  detector: string;
  totalTurns: number;
  activeTurns: number;
  observableTurns: number;
  unobservableTurns: number;
  reasons: Record<string, number>;
};

type ClusterAggregate = {
  scenarioCount: number;
  turnCount: number;
  auditViolationCounts: Record<string, number>;
  declaredFailureClasses: string[];
  detectorCoverage: Record<string, DetectorCoverageAggregate>;
  violatingTurns: ViolationDetail[];
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
const globalDetectorCoverage: Record<string, DetectorCoverageAggregate> = {};
const violatingTurns: ViolationDetail[] = [];
let totalTurns = 0;
let isolationFailures = 0;
let noAiBoundaryFailures = 0;

function compactPromptExcerpt(systemPrompt: string) {
  const lines = systemPrompt.split("\n");
  const relevant = lines.filter((line) =>
    /question|soru|sorabilirsin|clarif|netleştir|forbid|yasak|izin|allow|obligation|move|hard reason/iu.test(line),
  );
  return (relevant.length ? relevant : lines.slice(0, 18)).join("\n").slice(0, 4000);
}

function mergeCoverage(
  target: Record<string, DetectorCoverageAggregate>,
  clusterId: string,
  detector: string,
  active: boolean,
  observable: boolean,
  reason: string,
) {
  const key = `${clusterId}:${detector}`;
  const row = target[key] ??= {
    detector,
    totalTurns: 0,
    activeTurns: 0,
    observableTurns: 0,
    unobservableTurns: 0,
    reasons: {},
  };
  row.totalTurns += 1;
  if (active) row.activeTurns += 1;
  if (observable) row.observableTurns += 1;
  else row.unobservableTurns += 1;
  row.reasons[reason] = (row.reasons[reason] ?? 0) + 1;
}

for (const result of scenarioResults) {
  totalTurns += result.turns.length;
  const cluster = clusters[result.cluster] ??= {
    scenarioCount: 0,
    turnCount: 0,
    auditViolationCounts: {},
    declaredFailureClasses: [],
    detectorCoverage: {},
    violatingTurns: [],
    scenarios: [],
  };
  cluster.scenarioCount += 1;
  cluster.turnCount += result.turns.length;

  for (const [code, rawCount] of Object.entries(result.failureClassCounts as Record<string, number>)) {
    const count = Number(rawCount);
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
    auditViolationCounts: result.failureClassCounts as Record<string, number>,
    declaredFailureClasses,
    toolingNotes: result.toolingNotes,
  });

  for (const turn of result.turns) {
    if (!turn.audit.sessionIsolationCheck.isolated) isolationFailures += 1;
    if (turn.audit.noAiStopMarker !== "FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL") noAiBoundaryFailures += 1;

    for (const coverage of turn.audit.detectorCoverage ?? []) {
      mergeCoverage(
        globalDetectorCoverage,
        coverage.cluster,
        coverage.detector,
        coverage.active,
        coverage.observable,
        coverage.reason,
      );
      if (coverage.cluster === result.cluster) {
        mergeCoverage(
          cluster.detectorCoverage,
          coverage.cluster,
          coverage.detector,
          coverage.active,
          coverage.observable,
          coverage.reason,
        );
      }
    }

    if (turn.audit.invariantViolations.length > 0) {
      const obligation = turn.dialogueDecision?.obligation;
      const detail: ViolationDetail = {
        scenarioId: result.scenarioId,
        cluster: result.cluster,
        turnNumber: turn.turnNumber,
        userMessage: turn.userMessage,
        semanticSource: turn.semanticSource,
        violationCodes: turn.audit.invariantViolations.map((item) => item.code),
        violationMessages: turn.audit.invariantViolations.map((item) => item.message),
        responsePlan: {
          allowQuestion: Boolean(turn.responsePlan.allowQuestion),
          allowAffection: Boolean(turn.responsePlan.allowAffection),
          allowAdvice: turn.responsePlan.allowAdvice === true,
          requiredContent: turn.responsePlan.requiredContent ?? [],
          hardReasons: turn.responsePlan.hardReasons ?? [],
          maxWords: turn.responsePlan.maxWords,
          maxSentences: turn.responsePlan.maxSentences,
        },
        dialogueDecision: {
          move: turn.dialogueDecision?.move,
          target: turn.dialogueDecision?.target,
          reason: turn.dialogueDecision?.reason,
          obligationType: obligation?.type ?? null,
          allowedResolutions: obligation?.satisfactionCriteria?.allowedResolutions ?? [],
        },
        promptExcerpt: compactPromptExcerpt(turn.audit.finalPromptSnapshot.system),
      };
      violatingTurns.push(detail);
      cluster.violatingTurns.push(detail);
    }
  }
}

const clusterReadiness = Object.entries(clusters).map(([clusterId, cluster]) => {
  const relevant = Object.values(cluster.detectorCoverage);
  const hasObservableDetector = relevant.some((row) => row.observableTurns > 0);
  return {
    cluster: clusterId,
    hasObservableDetector,
    detectorCoverage: relevant,
  };
});

const everyClusterObservable = clusterReadiness.length === 5 && clusterReadiness.every((item) => item.hasObservableDetector);
const serializerByteParityProven = scenarioResults.every((result) =>
  result.toolingNotes.includes("prompt_serializer_byte_parity=proven_shared_function"),
);
const phase1Allowed =
  everyClusterObservable &&
  serializerByteParityProven &&
  isolationFailures === 0 &&
  noAiBoundaryFailures === 0;
const scaleGateReasons = [
  ...(everyClusterObservable ? [] : ["At least one Phase 0 cluster still has no observable automatic detector on real scenario turns."]),
  ...(serializerByteParityProven ? [] : ["Production/harness final-provider serializer byte parity is not proven."]),
  ...(isolationFailures === 0 ? [] : [`Session isolation failed on ${isolationFailures} turns.`]),
  ...(noAiBoundaryFailures === 0 ? [] : [`No-AI boundary failed on ${noAiBoundaryFailures} turns.`]),
];

const report = {
  reportType: "KAIRA_PREAI_PHASE0_TOOLING_REPORT",
  version: 4,
  generatedAt: new Date().toISOString(),
  matrixVersion: matrix.version,
  aiBoundary: matrix.aiBoundary,
  branchTrackType: "regression",
  semanticIngress: "deterministic_regex_floor",
  promptSerializerParity: serializerByteParityProven
    ? "byte_parity_proven_shared_production_serializer"
    : "not_proven",
  promptContextFidelity: "deterministic_phase0_subset_not_full_production_runtime",
  summary: {
    scenarioCount: scenarioResults.length,
    turnCount: totalTurns,
    clusterCount: Object.keys(clusters).length,
    isolationFailures,
    noAiBoundaryFailures,
    violatingTurnCount: violatingTurns.length,
    auditViolationCounts: globalViolationCounts,
    everyClusterObservable,
  },
  detectorCoverage: globalDetectorCoverage,
  clusterReadiness,
  violatingTurns,
  clusters,
  scaleGate: {
    phase1Allowed,
    reasons: scaleGateReasons,
    caveats: [
      "Detector families are separately self-validated in CI with known-bad synthetic inputs and clean counterexamples.",
      "Serializer byte parity does not imply full production-context parity; Phase 0 intentionally omits provider and persistent-service hydration.",
      "This run audits deterministic regex-floor ingestion, not production semantic-provider quality.",
    ],
  },
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary, null, 2));
console.log("Phase 0 detector coverage:");
console.log(JSON.stringify(globalDetectorCoverage, null, 2));
if (violatingTurns.length) {
  console.log("Phase 0 violating turns:");
  console.log(JSON.stringify(violatingTurns, null, 2));
}
console.log(`Phase 0 report written: ${outPath}`);
