import { listRecentKairaAutonomousLifeWorkerRuns } from "./kairaAutonomousLifeWorkerRunStore";
import {
  evaluateKairaAutonomousLifeWorkerHealth,
  type KairaAutonomousLifeWorkerHealth,
} from "./kairaAutonomousLifeWorkerHealthPolicy";

export async function readKairaAutonomousLifeWorkerHealth(input: {
  now: string;
  maxTerminalRunAgeMinutes: number;
  recentRunLimit?: number;
}): Promise<KairaAutonomousLifeWorkerHealth> {
  const recentRunLimit = Math.max(1, Math.min(100, Math.trunc(input.recentRunLimit || 20)));
  const recentRuns = await listRecentKairaAutonomousLifeWorkerRuns({ limit: recentRunLimit });
  return evaluateKairaAutonomousLifeWorkerHealth({
    now: input.now,
    recentRuns,
    maxTerminalRunAgeMinutes: input.maxTerminalRunAgeMinutes,
  });
}
