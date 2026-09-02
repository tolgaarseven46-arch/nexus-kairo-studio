import { describe, expect, it } from "vitest";
import { resolveKairaProposalRecoveryWorkerHealthConfig } from "./kairaProposalRecoveryWorkerHealthConfig";

const configuredEnv = (): NodeJS.ProcessEnv => ({
  KAIRA_RECOVERY_HEALTH_MAX_SUCCESS_AGE_MINUTES: "15",
  KAIRA_RECOVERY_HEALTH_DEGRADED_BACKLOG: "10",
  KAIRA_RECOVERY_HEALTH_UNHEALTHY_BACKLOG: "50",
  KAIRA_RECOVERY_HEALTH_DEGRADED_WORKER_FAILURES: "1",
  KAIRA_RECOVERY_HEALTH_UNHEALTHY_WORKER_FAILURES: "3",
  KAIRA_RECOVERY_HEALTH_DEGRADED_ITEM_FAILURE_RATE: "0.2",
  KAIRA_RECOVERY_HEALTH_UNHEALTHY_ITEM_FAILURE_RATE: "0.5",
});

describe("Kaira proposal recovery worker health config contracts", () => {
  it("keeps the health surface disabled when deployment thresholds are absent", () => {
    expect(resolveKairaProposalRecoveryWorkerHealthConfig({})).toEqual({
      status: "disabled",
      reason: "health_policy_not_configured",
    });
  });

  it("fails closed on a partially configured policy", () => {
    expect(resolveKairaProposalRecoveryWorkerHealthConfig({
      KAIRA_RECOVERY_HEALTH_MAX_SUCCESS_AGE_MINUTES: "15",
    })).toEqual({
      status: "invalid",
      reason: "incomplete_health_policy_configuration",
    });
  });

  it("rejects threshold ordering that would invert health severity", () => {
    const env = configuredEnv();
    env.KAIRA_RECOVERY_HEALTH_DEGRADED_BACKLOG = "50";
    env.KAIRA_RECOVERY_HEALTH_UNHEALTHY_BACKLOG = "10";
    expect(resolveKairaProposalRecoveryWorkerHealthConfig(env)).toEqual({
      status: "invalid",
      reason: "invalid_health_policy_configuration",
    });
  });

  it("returns typed thresholds and bounded read limits", () => {
    const env = configuredEnv();
    env.KAIRA_RECOVERY_HEALTH_RECENT_RUN_LIMIT = "999";
    env.KAIRA_RECOVERY_HEALTH_BACKLOG_SAMPLE_LIMIT = "0";
    expect(resolveKairaProposalRecoveryWorkerHealthConfig(env)).toEqual({
      status: "configured",
      thresholds: {
        maxSuccessfulRunAgeMinutes: 15,
        degradedBacklog: 10,
        unhealthyBacklog: 50,
        degradedConsecutiveWorkerFailures: 1,
        unhealthyConsecutiveWorkerFailures: 3,
        degradedItemFailureRate: 0.2,
        unhealthyItemFailureRate: 0.5,
      },
      recentRunLimit: 100,
      backlogSampleLimit: 1,
    });
  });
});
