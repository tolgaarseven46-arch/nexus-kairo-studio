import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("first-encounter combined coordination v8", () => {
  it("offers an atomic Firestore claim that acquires idempotency and state ownership together", async () => {
    const backend = await readFile(new URL("./kairaFirestoreCombinedCoordination.ts", import.meta.url), "utf8");
    expect(backend).toContain("runTransaction");
    expect(backend).toContain("kairaChatIdempotency");
    expect(backend).toContain("kairaStateMutationLocks");
    expect(backend).toContain("tx.get(idempotencyRef)");
    expect(backend).toContain("tx.get(stateRef)");
    expect(backend).toContain("tx.set(idempotencyRef");
    expect(backend).toContain("tx.set(stateRef");
  });

  it("uses the combined transaction only for first-encounter requests", async () => {
    const server = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    expect(server).toContain("preferCombinedFirstEncounterCoordination");
    expect(server).toContain('conversationPhase === "first_encounter"');
    expect(server).toContain("claimCoordinatedKairaChatRequest<any>(coordinationKey, {");
  });

  it("releases the preclaimed state lease after critical continuity and before distributed completion", async () => {
    const coordinator = await readFile(new URL("./kairaChatIdempotencyCoordinator.ts", import.meta.url), "utf8");
    const server = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    expect(coordinator).toContain("claimFirstEncounterCoordination");
    expect(coordinator).toContain("registerPreclaimedStateMutation");
    expect(coordinator).toContain("export async function releaseCoordinatedKairaChatStateMutation");
    const persistIndex = server.indexOf("await persistFirstEncounterContinuity();");
    const releaseIndex = server.indexOf("await releaseCoordinatedKairaChatStateMutation(coordinationKey);");
    const completeIndex = server.indexOf("await completeCoordinatedKairaChatRequest(coordinationKey, responsePayload);");
    expect(persistIndex).toBeGreaterThanOrEqual(0);
    expect(releaseIndex).toBeGreaterThan(persistIndex);
    expect(completeIndex).toBeGreaterThan(releaseIndex);
  });
});
