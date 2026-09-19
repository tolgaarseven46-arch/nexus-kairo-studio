import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("first-encounter busy state lease latency v10", () => {
  it("claims request idempotency without polling a busy state lease", async () => {
    const source = await readFile(
      new URL("./kairaFirestoreCombinedCoordination.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain('kind: "owner_deferred_state"');
    expect(source).toContain("const stateBusy =");
    expect(source).toContain("tx.set(idempotencyRef");
    expect(source).toContain('kind: "owner_deferred_state" as const');
    expect(source).not.toContain('return { kind: "state_busy" as const }');
  });

  it("lazily acquires deferred state ownership only when mutation ownership is asserted", async () => {
    const source = await readFile(
      new URL("./kairaChatIdempotencyCoordinator.ts", import.meta.url),
      "utf8",
    );

    const assertionStart = source.indexOf(
      "export async function assertCoordinatedKairaChatStateOwnership",
    );
    const deferredCheck = source.indexOf(
      "deferredStateMutationKeys.has(normalizedKey)",
      assertionStart,
    );
    const deferredAcquire = source.indexOf(
      "await acquireStateMutation(normalizedKey)",
      deferredCheck,
    );

    expect(source).toContain("const deferredStateMutationKeys = new Set<string>()");
    expect(source).toContain("deferredStateMutationKeys.add(normalizedKey)");
    expect(assertionStart).toBeGreaterThan(-1);
    expect(deferredCheck).toBeGreaterThan(assertionStart);
    expect(deferredAcquire).toBeGreaterThan(deferredCheck);
  });

  it("sends a first-encounter fast reply before waiting for deferred state ownership", async () => {
    const source = await readFile(new URL("../../server.ts", import.meta.url), "utf8");

    const ownershipDeclaration = source.indexOf("let ownershipMs = 0;");
    const nonFastOwnershipGate = source.indexOf(
      "if (!firstEncounterFastPersistence)",
      ownershipDeclaration,
    );
    const fastBranch = source.indexOf(
      "if (firstEncounterFastPersistence) {",
      nonFastOwnershipGate,
    );
    const send = source.indexOf(
      "sendFirstEncounterFastPayload(responsePayload);",
      fastBranch,
    );
    const deferredClaim = source.indexOf(
      "await assertStateMutationOwnership();",
      send,
    );

    expect(ownershipDeclaration).toBeGreaterThan(-1);
    expect(nonFastOwnershipGate).toBeGreaterThan(ownershipDeclaration);
    expect(fastBranch).toBeGreaterThan(nonFastOwnershipGate);
    expect(send).toBeGreaterThan(fastBranch);
    expect(deferredClaim).toBeGreaterThan(send);
  });
});
