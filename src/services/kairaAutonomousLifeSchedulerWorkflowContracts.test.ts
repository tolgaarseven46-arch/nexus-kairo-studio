import fs from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = fs.readFileSync(".github/workflows/kaira-autonomous-life.yml", "utf8");
const runner = fs.readFileSync("scripts/run-kaira-autonomous-life-wakeup.mjs", "utf8");

describe("Kaira autonomous life production scheduler contracts", () => {
  it("owns a bounded non-overlapping five-minute production wakeup", () => {
    expect(workflow).toContain('cron: "*/5 * * * *"');
    expect(workflow).toContain("group: kaira-autonomous-life-production");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("timeout-minutes: 5");
    expect(workflow).toContain("vars.KAIRA_AUTONOMOUS_LIFE_URL != ''");
  });

  it("uses one stable logical run id across workflow reruns", () => {
    expect(workflow).toContain("KAIRA_AUTONOMOUS_LIFE_RUN_ID: gha-autonomous-${{ github.run_id }}");
    expect(workflow).not.toContain("github.run_attempt");
    expect(runner).toContain('"x-kaira-worker-run-id": runId');
  });

  it("keeps worker credentials in GitHub secrets and never in source", () => {
    expect(workflow).toContain("secrets.KAIRA_INTERNAL_WORKER_SECRET");
    expect(workflow).not.toMatch(/Bearer\s+[A-Za-z0-9_-]{12,}/);
    expect(runner).toContain("`Bearer ${secret}`");
    expect(runner).not.toMatch(/console\.log\([^)]*secret/);
  });

  it("verifies durable receipt replay and holistic health after the wakeup", () => {
    expect(runner.match(/await invoke\(\)/g)).toHaveLength(2);
    expect(runner).toContain('replay.body?.deliveryStatus !== "replayed"');
    expect(runner).toContain('"/internal/workers/kaira/autonomous-life/health"');
    expect(runner).toContain("health.body?.health?.latestRunId !== runId");
  });

  it("emits bounded stage diagnostics without exposing credentials", () => {
    expect(runner).toContain("stages: summary ?");
    expect(runner).toContain("planning: summary.planning");
    expect(runner).toContain("recovery: summary.recovery");
    expect(runner).toContain("schedules: summary.schedules");
    expect(runner).toContain("failedPlanningItems");
    expect(runner).toContain(".slice(0, 5)");
    expect(runner).toContain(".slice(0, 500)");
    expect(runner).not.toMatch(/console\.error\([^)]*secret/);
  });
});
