import { describe, expect, it } from "vitest";
import { resolveKairaAutonomousLifeWorkerHealthConfig } from "./kairaAutonomousLifeWorkerHealthConfig";

describe("Kaira autonomous life worker health config", () => {
  it("uses cadence-aligned defaults without proposal recovery configuration", () => {
    expect(resolveKairaAutonomousLifeWorkerHealthConfig({})).toEqual({
      status: "configured",
      maxTerminalRunAgeMinutes: 15,
      recentRunLimit: 20,
    });
  });

  it("accepts bounded autonomous-only overrides", () => {
    expect(resolveKairaAutonomousLifeWorkerHealthConfig({
      KAIRA_AUTONOMOUS_HEALTH_MAX_TERMINAL_AGE_MINUTES: "30",
      KAIRA_AUTONOMOUS_HEALTH_RECENT_RUN_LIMIT: "999",
    })).toEqual({
      status: "configured",
      maxTerminalRunAgeMinutes: 30,
      recentRunLimit: 100,
    });
  });

  it("fails closed on malformed autonomous health policy", () => {
    expect(resolveKairaAutonomousLifeWorkerHealthConfig({
      KAIRA_AUTONOMOUS_HEALTH_MAX_TERMINAL_AGE_MINUTES: "0",
    })).toEqual({
      status: "invalid",
      reason: "invalid_kaira_autonomous_health_run_age_threshold",
    });
  });
});
