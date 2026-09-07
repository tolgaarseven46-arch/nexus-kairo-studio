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

type ClusterAggregate = {
  scenarioCount: number;
  turnCount: number;
  auditViolationCounts: Record<string, number>;
  declaredFailureClasses: string[];
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

for (const result of scenarioResults) {
  totalTurns += result.turns.length;
  const cluster = clusters[result.cluster] ??= {
    scenarioCount: 0,
    turnCount: 0,
    auditViolationCounts: {},
    declaredFailureClasses: [],
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

const report = {
  reportType: "KAIRA_PREAI_PHASE0_TOOLING_REPORT",
  version: 2,
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
    violatingTurnCount: violatingTurns.length,
    auditViolationCounts: globalViolationCounts,
  },
  violatingTurns,
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
if (violatingTurns.length) {
  console.log("Phase 0 violating turns:");
  console.log(JSON.stringify(violatingTurns, null, 2));
}
console.log(`Phase 0 report written: ${outPath}`);
