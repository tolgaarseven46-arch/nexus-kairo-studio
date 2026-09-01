import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const server = readFileSync("server.ts", "utf8");
const persistence = readFileSync("src/services/kdmPersistenceService.ts", "utf8");
const nexus = readFileSync("src/types/nexus.ts", "utf8");
const count = (needle: string) => server.split(needle).length - 1;

describe("Kaira lived autobiographical runtime integration", () => {
  it("uses one canonical coordinator in both response paths", () => {
    expect(server).toContain('from "./src/services/kairaLivedMemoryRuntime"');
    expect(count("persistWorldEventAndMaybeConsolidateLivedMemory({")).toBe(2);
    expect(server).not.toContain("saveWorldEventObservation({");
  });

  it("feeds the canonical post-KDM dynamic state into consolidation", () => {
    const calls = server.match(/persistWorldEventAndMaybeConsolidateLivedMemory\(\{[\s\S]*?dynamicStateAfter:\s*kdm\.nextDynamicState,[\s\S]*?\}\);/g) ?? [];
    expect(calls).toHaveLength(2);
  });

  it("finishes lived-memory mutation before KNT and turn observability persistence", () => {
    const firstCoordinator = server.indexOf("const livedMemoryRuntime = await persistWorldEventAndMaybeConsolidateLivedMemory({");
    const firstKnt = server.indexOf("saveKntTrace({", firstCoordinator);
    const firstTurn = server.indexOf("saveTestSessionTurn({", firstCoordinator);
    expect(firstCoordinator).toBeGreaterThan(-1);
    expect(firstKnt).toBeGreaterThan(firstCoordinator);
    expect(firstTurn).toBeGreaterThan(firstCoordinator);

    const secondCoordinator = server.indexOf("const livedMemoryRuntime = await persistWorldEventAndMaybeConsolidateLivedMemory({", firstCoordinator + 1);
    const secondKnt = server.indexOf("saveKntTrace({", secondCoordinator);
    const secondTurn = server.indexOf("saveTestSessionTurn({", secondCoordinator);
    expect(secondCoordinator).toBeGreaterThan(firstCoordinator);
    expect(secondKnt).toBeGreaterThan(secondCoordinator);
    expect(secondTurn).toBeGreaterThan(secondCoordinator);
  });

  it("exposes the same lived-memory result in KNT, turn metadata and API KDM output", () => {
    expect(count("livedMemoryRuntime,")).toBeGreaterThanOrEqual(6);
    expect(persistence).toContain("livedMemoryRuntime?: unknown");
    expect(persistence).toContain("livedMemoryRuntime: payload.metadata?.livedMemoryRuntime");
    expect(nexus).toContain("livedMemoryRuntime?: unknown");
  });

  it("keeps world truth and autobiography as separate authorities", () => {
    const runtime = readFileSync("src/services/kairaLivedMemoryRuntime.ts", "utf8");
    const postPersistence = readFileSync("src/services/kairaPersistedObservationConsolidation.ts", "utf8");

    expect(runtime).toContain("saveWorldEventObservation({");
    expect(runtime).toContain("consolidatePersistedWorldObservation({");
    expect(runtime.indexOf("saveWorldEventObservation({")).toBeLessThan(
      runtime.indexOf("consolidatePersistedWorldObservation({"),
    );
    expect(runtime).not.toContain("appraiseLivedMemoryCandidate({");
    expect(runtime).not.toContain("appendKairaAutobiographicalMemoryAtomic(");
    expect(runtime).not.toContain("saveKairaCanonicalIdentity(");

    expect(postPersistence).not.toContain("saveWorldEventObservation({");
    expect(postPersistence.indexOf("appraiseLivedMemoryCandidate({")).toBeLessThan(
      postPersistence.indexOf("appendKairaAutobiographicalMemoryAtomic(instance, memory)"),
    );
    expect(postPersistence.indexOf("appendKairaAutobiographicalMemoryAtomic(instance, memory)")).toBeLessThan(
      postPersistence.indexOf("maybeApplySelfRevision(instance, memory.selfRevisionEvidence?.factKey)"),
    );
  });
});
