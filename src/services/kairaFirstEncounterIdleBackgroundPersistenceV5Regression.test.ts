import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("first-encounter idle background persistence wiring", () => {
  const source = readFileSync(new URL("../../server.ts", import.meta.url), "utf8");

  it("keeps critical continuity before state-lease release", () => {
    const critical = source.indexOf("await persistFirstEncounterContinuity();");
    const release = source.indexOf("await releaseCoordinatedKairaChatStateMutation(coordinationKey);");
    expect(critical).toBeGreaterThan(-1);
    expect(release).toBeGreaterThan(critical);
  });

  it("queues non-critical first-encounter writes behind an idle window", () => {
    expect(source).toContain("FIRST_ENCOUNTER_BACKGROUND_IDLE_MS = 5_000");
    expect(source).toContain("enqueueFirstEncounterBackgroundPersistence(backgroundQueueKey");
    expect(source).toContain("await saveMetricTelemetry();");
    expect(source).toContain("await saveKntTelemetry();");
    expect(source).toContain("await saveAutonomousState();");
    const release = source.indexOf("await releaseCoordinatedKairaChatStateMutation(coordinationKey);");
    const enqueue = source.indexOf("enqueueFirstEncounterBackgroundPersistence(backgroundQueueKey");
    expect(enqueue).toBeGreaterThan(release);
  });

  it("debounces per user+Kaira key without dropping queued jobs", () => {
    expect(source).toContain("const jobs = existing ? [...existing.jobs, job] : [job]");
    expect(source).toContain("if (existing) clearTimeout(existing.timer)");
    expect(source).toContain("for (const queuedJob of queued.jobs)");
  });
});
