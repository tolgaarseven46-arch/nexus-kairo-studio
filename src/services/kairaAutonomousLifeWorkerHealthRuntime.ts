import { listRecentKairaAutonomousLifeWorkerRuns } from "./kairaAutonomousLifeWorkerRunStore";
import {
  evaluateKairaAutonomousLifeWorkerHealth,
  type KairaAutonomousLifeWorkerHealth,
} from "./kairaAutonomousLifeWorkerHealthPolicy";
import { listPendingKairaActivityPermissionExecutions } from "./kairaActivityExecutionStore";

export interface KairaActivityPermissionAttentionHealth {
  status: "available" | "unavailable";
  sampledPendingCount: number;
  oldestPendingAt: string | null;
  sampleLimitReached: boolean;
}

export type KairaAutonomousLifeWorkerRuntimeHealth = KairaAutonomousLifeWorkerHealth & {
  permissionAttention: KairaActivityPermissionAttentionHealth;
};

export async function readKairaAutonomousLifeWorkerHealth(input: {
  now: string;
  maxTerminalRunAgeMinutes: number;
  recentRunLimit?: number;
}): Promise<KairaAutonomousLifeWorkerRuntimeHealth> {
  const recentRunLimit = Math.max(1, Math.min(100, Math.trunc(input.recentRunLimit || 20)));
  const permissionSampleLimit = 100;
  const [recentRuns, pendingPermissions] = await Promise.all([
    listRecentKairaAutonomousLifeWorkerRuns({ limit: recentRunLimit }),
    listPendingKairaActivityPermissionExecutions({ batchSize: permissionSampleLimit }).catch(() => null),
  ]);
  const health = evaluateKairaAutonomousLifeWorkerHealth({
    now: input.now,
    recentRuns,
    maxTerminalRunAgeMinutes: input.maxTerminalRunAgeMinutes,
  });
  const oldestPendingAt = pendingPermissions
    ? [...pendingPermissions].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))[0]?.createdAt || null
    : null;
  return {
    ...health,
    permissionAttention: pendingPermissions
      ? {
          status: "available",
          sampledPendingCount: pendingPermissions.length,
          oldestPendingAt,
          sampleLimitReached: pendingPermissions.length === permissionSampleLimit,
        }
      : {
          status: "unavailable",
          sampledPendingCount: 0,
          oldestPendingAt: null,
          sampleLimitReached: false,
        },
  };
}
