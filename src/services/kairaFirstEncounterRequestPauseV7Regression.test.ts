import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("first-encounter request-start background pause", () => {
  const source = readFileSync(new URL("../../server.ts", import.meta.url), "utf8");

  it("pauses pending non-critical flush before first-encounter coordination claim", () => {
    const phase = source.indexOf('const conversationPhase =');
    const pause = source.indexOf('pauseFirstEncounterBackgroundPersistence(firstEncounterBackgroundQueueKey)');
    const claim = source.indexOf('claimCoordinatedKairaChatRequest<any>(coordinationKey');
    expect(phase).toBeGreaterThan(-1);
    expect(pause).toBeGreaterThan(phase);
    expect(claim).toBeGreaterThan(pause);
  });

  it("preserves queued jobs when pausing and restarts idle timing on enqueue", () => {
    expect(source).toContain('timer: ReturnType<typeof setTimeout> | null');
    expect(source).toContain('firstEncounterBackgroundQueues.set(key, { timer: null, jobs: existing.jobs })');
    expect(source).toContain('const jobs = existing ? [...existing.jobs, job] : [job]');
    expect(source).toContain('enqueueFirstEncounterBackgroundPersistence(firstEncounterBackgroundQueueKey');
  });
});
