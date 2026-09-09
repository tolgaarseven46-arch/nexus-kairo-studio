import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runKairaNaturalCharacterizationV2 } from "../src/services/kairaNaturalCharacterizationV2";

const outputPath = resolve(
  process.argv[2] || "artifacts/fast-ci/natural-characterization-v2-report.json",
);
mkdirSync(dirname(outputPath), { recursive: true });

const report = await runKairaNaturalCharacterizationV2(
  `cli_${Date.now().toString(36)}`,
);
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

const compact = report.executions.map((execution) => ({
  scenarioId: execution.scenarioId,
  variantId: execution.variantId,
  openQuestionId: execution.openQuestionId,
  classification: execution.classification,
  evidence: execution.evidence,
}));

console.log(
  `NATURAL_CHARACTERIZATION_V2 ${JSON.stringify({
    scenarioCount: report.scenarioCount,
    executionCount: report.executionCount,
    turnCount: report.turnCount,
    classCounts: report.classCounts,
    results: compact,
    outputPath,
  })}`,
);

// Characterization is allowed to DISCOVER FAIL_PRODUCT; that is its purpose.
// Only a broken test/detector contract blocks the characterization tooling lane.
process.exit(report.classCounts.FAIL_TEST_OR_DETECTOR > 0 ? 1 : 0);
