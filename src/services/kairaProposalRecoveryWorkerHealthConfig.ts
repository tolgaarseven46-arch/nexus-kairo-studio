import type { KairaProposalRecoveryWorkerHealthThresholds } from "./kairaProposalRecoveryWorkerHealthPolicy";

export type KairaProposalRecoveryWorkerHealthConfigResult =
  | {
      status: "configured";
      thresholds: KairaProposalRecoveryWorkerHealthThresholds;
      recentRunLimit: number;
      backlogSampleLimit: number;
    }
  | { status: "disabled"; reason: "health_policy_not_configured" }
  | { status: "invalid"; reason: string };

const requiredKeys = [
  "KAIRA_RECOVERY_HEALTH_MAX_SUCCESS_AGE_MINUTES",
  "KAIRA_RECOVERY_HEALTH_DEGRADED_BACKLOG",
  "KAIRA_RECOVERY_HEALTH_UNHEALTHY_BACKLOG",
  "KAIRA_RECOVERY_HEALTH_DEGRADED_WORKER_FAILURES",
  "KAIRA_RECOVERY_HEALTH_UNHEALTHY_WORKER_FAILURES",
  "KAIRA_RECOVERY_HEALTH_DEGRADED_ITEM_FAILURE_RATE",
  "KAIRA_RECOVERY_HEALTH_UNHEALTHY_ITEM_FAILURE_RATE",
] as const;

function numberValue(env: NodeJS.ProcessEnv, key: string): number {
  const value = Number(env[key]);
  if (!Number.isFinite(value)) throw new Error(`invalid_${key.toLowerCase()}`);
  return value;
}

function boundedInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("invalid_health_read_limit");
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
}

export function resolveKairaProposalRecoveryWorkerHealthConfig(
  env: NodeJS.ProcessEnv = process.env,
): KairaProposalRecoveryWorkerHealthConfigResult {
  const present = requiredKeys.filter((key) => String(env[key] || "").trim() !== "");
  if (!present.length) return { status: "disabled", reason: "health_policy_not_configured" };
  if (present.length !== requiredKeys.length) {
    return { status: "invalid", reason: "incomplete_health_policy_configuration" };
  }

  try {
    const thresholds: KairaProposalRecoveryWorkerHealthThresholds = {
      maxSuccessfulRunAgeMinutes: numberValue(env, requiredKeys[0]),
      degradedBacklog: numberValue(env, requiredKeys[1]),
      unhealthyBacklog: numberValue(env, requiredKeys[2]),
      degradedConsecutiveWorkerFailures: numberValue(env, requiredKeys[3]),
      unhealthyConsecutiveWorkerFailures: numberValue(env, requiredKeys[4]),
      degradedItemFailureRate: numberValue(env, requiredKeys[5]),
      unhealthyItemFailureRate: numberValue(env, requiredKeys[6]),
    };

    // Keep deployment cadence/config outside core policy, but reject obviously
    // malformed ordering before any Firestore health reads are attempted.
    if (
      thresholds.maxSuccessfulRunAgeMinutes <= 0 ||
      thresholds.degradedBacklog <= 0 ||
      thresholds.unhealthyBacklog < thresholds.degradedBacklog ||
      thresholds.degradedConsecutiveWorkerFailures <= 0 ||
      thresholds.unhealthyConsecutiveWorkerFailures < thresholds.degradedConsecutiveWorkerFailures ||
      thresholds.degradedItemFailureRate < 0 ||
      thresholds.degradedItemFailureRate > 1 ||
      thresholds.unhealthyItemFailureRate < thresholds.degradedItemFailureRate ||
      thresholds.unhealthyItemFailureRate > 1
    ) {
      return { status: "invalid", reason: "invalid_health_policy_configuration" };
    }

    return {
      status: "configured",
      thresholds,
      recentRunLimit: boundedInt(env.KAIRA_RECOVERY_HEALTH_RECENT_RUN_LIMIT, 20),
      backlogSampleLimit: boundedInt(env.KAIRA_RECOVERY_HEALTH_BACKLOG_SAMPLE_LIMIT, 100),
    };
  } catch (error) {
    return {
      status: "invalid",
      reason: error instanceof Error ? error.message : "invalid_health_policy_configuration",
    };
  }
}
