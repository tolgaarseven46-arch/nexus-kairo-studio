export type KairaAutonomousLifeWorkerHealthConfigResult =
  | {
      status: "configured";
      maxTerminalRunAgeMinutes: number;
      recentRunLimit: number;
    }
  | { status: "invalid"; reason: string };

const positiveNumber = (value: string | undefined, fallback: number, reason: string) => {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(reason);
  return parsed;
};

const boundedInt = (value: string | undefined, fallback: number) => {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("invalid_kaira_autonomous_health_recent_run_limit");
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
};

/**
 * Holistic tick health has its own deployment policy. Defaults are intentionally
 * aligned with the five-minute production cadence and do not depend on proposal-
 * recovery backlog thresholds.
 */
export function resolveKairaAutonomousLifeWorkerHealthConfig(
  env: NodeJS.ProcessEnv = process.env,
): KairaAutonomousLifeWorkerHealthConfigResult {
  try {
    return {
      status: "configured",
      maxTerminalRunAgeMinutes: positiveNumber(
        env.KAIRA_AUTONOMOUS_HEALTH_MAX_TERMINAL_AGE_MINUTES,
        15,
        "invalid_kaira_autonomous_health_run_age_threshold",
      ),
      recentRunLimit: boundedInt(env.KAIRA_AUTONOMOUS_HEALTH_RECENT_RUN_LIMIT, 20),
    };
  } catch (error) {
    return {
      status: "invalid",
      reason: error instanceof Error ? error.message : "invalid_kaira_autonomous_health_configuration",
    };
  }
}
