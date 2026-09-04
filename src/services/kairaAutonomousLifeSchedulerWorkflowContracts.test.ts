import fs from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = fs.readFileSync(".github/workflows/kaira-autonomous-life.yml", "utf8");
const runner = fs.readFileSync("scripts/run-kaira-autonomous-life-wakeup.mjs", "utf8");

describe("Kaira autonomous life production scheduler contracts", () => {
  it("owns a bounded non-overlapping five-minute production wakeup with enough completion headroom", () => {
    expect(workflow).toContain('cron: "*/5 * * * *"');
    expect(workflow).toContain("group: kaira-autonomous-life-production");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("timeout-minutes: 7");
    expect(workflow).toContain('KAIRA_AUTONOMOUS_LIFE_TIMEOUT_MS: "240000"');
    expect(workflow).toContain("vars.KAIRA_AUTONOMOUS_LIFE_URL != ''");
    expect(workflow).toContain("actions/checkout@v5");
    expect(workflow).toContain("actions/setup-node@v5");
    expect(workflow).toContain("node-version: 24");
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

  it("uses a production-sized first-call timeout while bounding replay and health probes", () => {
    expect(runner).toContain("KAIRA_AUTONOMOUS_LIFE_TIMEOUT_MS");
    expect(runner).toContain("240_000");
    expect(runner).toContain("const replayTimeoutMs = Math.min(workerTimeoutMs, 90_000)");
    expect(runner).toContain("const healthTimeoutMs = Math.min(workerTimeoutMs, 60_000)");
    expect(runner).toContain("Kaira worker request timed out after ${timeoutMs}ms");
  });

  it("fails the scheduled job when any terminal autonomous stage reports failures", () => {
    expect(runner).toContain("function assertTerminalStageSuccess(body)");
    expect(runner).toContain('planning: Number(summary?.planning?.failed || 0)');
    expect(runner).toContain('recovery: Number(summary?.recovery?.failed || 0)');
    expect(runner).toContain('schedules: Number(summary?.schedules?.failed || 0)');
    expect(runner).toContain("if (failedStages.length)");
    expect(runner).toContain("Autonomous life stage failures:");
    expect(runner).toContain("const summary = first.body.status === \"busy\" ? undefined : assertTerminalStageSuccess(first.body)");
    expect(runner).toContain("assertTerminalStageSuccess(replay.body)");
  });

  it("verifies durable receipt replay and holistic health after the wakeup", () => {
    expect(runner).toContain("const first = await invoke()");
    expect(runner).toContain("replay = await invoke(replayTimeoutMs)");
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