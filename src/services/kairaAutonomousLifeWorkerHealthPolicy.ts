import type { KairaAutonomousLifeWorkerRunReceipt } from "./kairaAutonomousLifeWorkerRunStore";

export type KairaAutonomousLifeWorkerHealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface KairaAutonomousLifeWorkerHealth {
  status: KairaAutonomousLifeWorkerHealthStatus;
  reasons: string[];
  latestRunId: string | null;
  latestTerminalAt: string | null;
  latestOutcome: string | null;
  consecutiveDegradedTicks: number;
  consecutiveFailedTicks: number;
}

export function evaluateKairaAutonomousLifeWorkerHealth(input: {
  now: string;
  recentRuns: KairaAutonomousLifeWorkerRunReceipt[];
  maxTerminalRunAgeMinutes: number;
}): KairaAutonomousLifeWorkerHealth {
  const nowMs = Date.parse(input.now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira autonomous life health time");
  if (!Number.isFinite(input.maxTerminalRunAgeMinutes) || input.maxTerminalRunAgeMinutes <= 0) {
    throw new Error("Invalid Kaira autonomous life health run age threshold");
  }
  const runs = [...input.recentRuns].sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt));
  const latest = runs[0] || null;
  const terminal = runs.filter((run) => run.status === "completed" || run.status === "failed");
  const latestTerminal = terminal[0] || null;
  if (!latestTerminal) {
    const leaseExpired = latest?.status === "running" && Date.parse(latest.leaseUntil) <= nowMs;
    return {
      status: leaseExpired ? "unhealthy" : "unknown",
      reasons: [leaseExpired ? "autonomous_tick_lease_expired" : "no_terminal_autonomous_tick"],
      latestRunId: latest?.runId || null,
      latestTerminalAt: null,
      latestOutcome: null,
      consecutiveDegradedTicks: 0,
      consecutiveFailedTicks: 0,
    };
  }

  let consecutiveDegradedTicks = 0;
  let consecutiveFailedTicks = 0;
  for (const run of terminal) {
    const outcome = run.status === "failed" ? "failed" : run.summary?.outcome;
    if (outcome === "degraded") consecutiveDegradedTicks += 1;
    else break;
  }
  for (const run of terminal) {
    const outcome = run.status === "failed" ? "failed" : run.summary?.outcome;
    if (outcome === "failed" || outcome === "partial_failure") consecutiveFailedTicks += 1;
    else break;
  }

  const latestOutcome = latestTerminal.status === "failed"
    ? "failed"
    : latestTerminal.summary?.outcome || null;
  const reasons: string[] = [];
  let severity = 0;
  const mark = (level: 1 | 2, reason: string) => {
    severity = Math.max(severity, level);
    reasons.push(reason);
  };
  if (latestOutcome === "failed" || latestOutcome === "partial_failure") {
    mark(2, "latest_autonomous_tick_failed");
  } else if (latestOutcome === "degraded") {
    mark(1, "latest_autonomous_tick_degraded");
  } else if (latestOutcome !== "completed") {
    mark(2, "invalid_autonomous_tick_outcome");
  }
  if (latest?.status === "running" && Date.parse(latest.leaseUntil) <= nowMs) {
    mark(2, "autonomous_tick_lease_expired");
  }
  const terminalAt = latestTerminal.completedAt;
  const terminalAgeMinutes = terminalAt ? (nowMs - Date.parse(terminalAt)) / 60_000 : Number.NaN;
  if (!Number.isFinite(terminalAgeMinutes) || terminalAgeMinutes < 0) {
    mark(2, "invalid_autonomous_tick_time");
  } else if (terminalAgeMinutes > input.maxTerminalRunAgeMinutes) {
    mark(2, "autonomous_tick_stale");
  }

  return {
    status: severity >= 2 ? "unhealthy" : severity === 1 ? "degraded" : "healthy",
    reasons,
    latestRunId: latest?.runId || latestTerminal.runId,
    latestTerminalAt: terminalAt || null,
    latestOutcome,
    consecutiveDegradedTicks,
    consecutiveFailedTicks,
  };
}
