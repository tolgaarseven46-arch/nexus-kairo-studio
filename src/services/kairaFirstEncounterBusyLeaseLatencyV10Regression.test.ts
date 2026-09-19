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

    expect(source).toContain("const deferredStateMutationKeys = new Set<string>()");
    expect(source).toContain("deferredStateMutationKeys.add(normalizedKey)");
    expect(source).toMatch(
      /assertCoordinatedKairaChatStateOwnership[sS]*?deferredStateMutationKeys.has(normalizedKey)[sS]*?await acquireStateMutation(normalizedKey)/,
    );
  });

  it("sends a first-encounter fast reply before waiting for deferred state ownership", async () => {
    const source = await readFile(new URL("../../server.ts", import.meta.url), "utf8");

    const fastBranch = source.indexOf("if (firstEncounterFastPersistence) {");
    const send = source.indexOf("sendFirstEncounterFastPayload(responsePayload);", fastBranch);
    const deferredClaim = source.indexOf("await assertStateMutationOwnership();", send);

    expect(fastBranch).toBeGreaterThan(-1);
    expect(send).toBeGreaterThan(fastBranch);
    expect(deferredClaim).toBeGreaterThan(send);

    const preFast = source.slice(
      source.indexOf("let ownershipMs = 0;", fastBranch - 10000),
      fastBranch,
    );
    expect(preFast).toContain("if (!firstEncounterFastPersistence)");
  });
});
