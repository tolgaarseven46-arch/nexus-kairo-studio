import type { KairaProposalRecoveryWorkerRunReceipt } from "./kairaProposalRecoveryWorkerRunStore";

export interface KairaProposalRecoveryWorkerHealthThresholds {
  maxSuccessfulRunAgeMinutes: number;
  degradedBacklog: number;
  unhealthyBacklog: number;
  degradedConsecutiveWorkerFailures: number;
  unhealthyConsecutiveWorkerFailures: number;
  degradedItemFailureRate: number;
  unhealthyItemFailureRate: number;
}

export interface KairaProposalRecoveryWorkerHealthInput {
  now: string;
  recentRuns: KairaProposalRecoveryWorkerRunReceipt[];
  selectedBacklogSampleCount: number;
  backlogSampleLimit: number;
  thresholds: KairaProposalRecoveryWorkerHealthThresholds;
}

export type KairaProposalRecoveryWorkerHealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface KairaProposalRecoveryWorkerHealth {
  status: KairaProposalRecoveryWorkerHealthStatus;
  reasons: string[];
  latestRunId: string | null;
  latestSuccessfulRunAt: string | null;
  consecutiveWorkerFailures: number;
  recentItemFailureRate: number;
  selectedBacklogSampleCount: number;
  backlogSampleLimit: number;
  backlogSampleSaturated: boolean;
}

const finitePositive = (value: number, label: string) => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid Kaira recovery health ${label}`);
  return value;
};

function validateThresholds(value: KairaProposalRecoveryWorkerHealthThresholds) {
  finitePositive(value.maxSuccessfulRunAgeMinutes, "run age threshold");
  finitePositive(value.degradedBacklog, "degraded backlog threshold");
  finitePositive(value.unhealthyBacklog, "unhealthy backlog threshold");
  finitePositive(value.degradedConsecutiveWorkerFailures, "degraded failure threshold");
  finitePositive(value.unhealthyConsecutiveWorkerFailures, "unhealthy failure threshold");
  if (value.unhealthyBacklog < value.degradedBacklog) throw new Error("Invalid Kaira recovery health backlog ordering");
  if (value.unhealthyConsecutiveWorkerFailures < value.degradedConsecutiveWorkerFailures) {
    throw new Error("Invalid Kaira recovery health failure ordering");
  }
  for (const [label, rate] of [
    ["degraded item failure rate", value.degradedItemFailureRate],
    ["unhealthy item failure rate", value.unhealthyItemFailureRate],
  ] as const) {
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) throw new Error(`Invalid Kaira recovery health ${label}`);
  }
  if (value.unhealthyItemFailureRate < value.degradedItemFailureRate) {
    throw new Error("Invalid Kaira recovery health item failure ordering");
  }
}

export function evaluateKairaProposalRecoveryWorkerHealth(
  input: KairaProposalRecoveryWorkerHealthInput,
): KairaProposalRecoveryWorkerHealth {
  const nowMs = Date.parse(input.now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira recovery health time");
  validateThresholds(input.thresholds);
  if (!Number.isInteger(input.backlogSampleLimit) || input.backlogSampleLimit < 1 || input.backlogSampleLimit > 100) {
    throw new Error("Invalid Kaira recovery health backlog sample limit");
  }
  if (!Number.isInteger(input.selectedBacklogSampleCount) || input.selectedBacklogSampleCount < 0 || input.selectedBacklogSampleCount > input.backlogSampleLimit) {
    throw new Error("Invalid Kaira recovery health backlog sample count");
  }

  const runs = [...input.recentRuns].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const terminalRuns = runs.filter((run) => run.status === "completed" || run.status === "failed");
  const latest = runs[0] || null;
  const latestSuccess = terminalRuns.find((run) => run.status === "completed") || null;
  let consecutiveWorkerFailures = 0;
  for (const run of terminalRuns) {
    if (run.status !== "failed") break;
    consecutiveWorkerFailures += 1;
  }

  const completedRuns = terminalRuns.filter((run) => run.status === "completed" && run.summary).slice(0, 10);
  const totalItems = completedRuns.reduce((sum, run) => sum + (run.summary?.items.length || 0), 0);
  const failedItems = completedRuns.reduce(
    (sum, run) => sum + (run.summary?.items.filter((item) => item.outcome === "failed").length || 0),
    0,
  );
  const recentItemFailureRate = totalItems > 0 ? failedItems / totalItems : 0;
  const backlogSampleSaturated = input.selectedBacklogSampleCount >= input.backlogSampleLimit;
  const reasons: string[] = [];
  let severity = 0;
  const mark = (level: 1 | 2, reason: string) => {
    severity = Math.max(severity, level);
    reasons.push(reason);
  };

  if (!terminalRuns.length) {
    if (input.selectedBacklogSampleCount > 0) mark(2, "no_terminal_worker_run_with_backlog");
    else return {
      status: "unknown",
      reasons: ["no_terminal_worker_run"],
      latestRunId: latest?.runId || null,
      latestSuccessfulRunAt: null,
      consecutiveWorkerFailures,
      recentItemFailureRate,
      selectedBacklogSampleCount: input.selectedBacklogSampleCount,
      backlogSampleLimit: input.backlogSampleLimit,
      backlogSampleSaturated,
    };
  }

  if (consecutiveWorkerFailures >= input.thresholds.unhealthyConsecutiveWorkerFailures) {
    mark(2, "consecutive_worker_failures");
  } else if (consecutiveWorkerFailures >= input.thresholds.degradedConsecutiveWorkerFailures) {
    mark(1, "recent_worker_failure");
  }

  if (input.selectedBacklogSampleCount >= input.thresholds.unhealthyBacklog || backlogSampleSaturated) {
    mark(2, "recovery_backlog_high");
  } else if (input.selectedBacklogSampleCount >= input.thresholds.degradedBacklog) {
    mark(1, "recovery_backlog_elevated");
  }

  if (recentItemFailureRate >= input.thresholds.unhealthyItemFailureRate && totalItems > 0) {
    mark(2, "item_failure_rate_high");
  } else if (recentItemFailureRate >= input.thresholds.degradedItemFailureRate && totalItems > 0) {
    mark(1, "item_failure_rate_elevated");
  }

  if (latestSuccess?.completedAt) {
    const ageMinutes = (nowMs - Date.parse(latestSuccess.completedAt)) / 60_000;
    if (!Number.isFinite(ageMinutes) || ageMinutes < 0) mark(2, "invalid_success_run_time");
    else if (ageMinutes > input.thresholds.maxSuccessfulRunAgeMinutes && input.selectedBacklogSampleCount > 0) {
      mark(2, "successful_run_stale_with_backlog");
    } else if (ageMinutes > input.thresholds.maxSuccessfulRunAgeMinutes) {
      mark(1, "successful_run_stale");
    }
  } else if (input.selectedBacklogSampleCount > 0) {
    mark(2, "no_successful_worker_run_with_backlog");
  }

  return {
    status: severity >= 2 ? "unhealthy" : severity === 1 ? "degraded" : "healthy",
    reasons,
    latestRunId: latest?.runId || null,
    latestSuccessfulRunAt: latestSuccess?.completedAt || null,
    consecutiveWorkerFailures,
    recentItemFailureRate,
    selectedBacklogSampleCount: input.selectedBacklogSampleCount,
    backlogSampleLimit: input.backlogSampleLimit,
    backlogSampleSaturated,
  };
}
