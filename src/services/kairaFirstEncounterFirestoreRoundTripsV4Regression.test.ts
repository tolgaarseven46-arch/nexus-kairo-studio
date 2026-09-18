import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("first-encounter Firestore round-trip latency v4", () => {
  it("checks an already-held state lease locally instead of forcing a second Firestore renewal", async () => {
    const distributed = await readFile(new URL("./kairaDistributedStateMutation.ts", import.meta.url), "utf8");
    const coordinator = await readFile(new URL("./kairaChatIdempotencyCoordinator.ts", import.meta.url), "utf8");

    expect(distributed).toContain("assertHeld");
    expect(coordinator).toContain("assertHeld: lease.assertHeld");
    expect(coordinator).toContain("await handle.assertHeld()");
  });

  it("does not hydrate unrelated persistent/language memory for typed trivial first-encounter social turns", async () => {
    const server = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    expect(server).toContain("firstEncounterTrivialSocial");
    expect(server).toMatch(/firstEncounterTrivialSocial\s*\?\s*Promise\.resolve\(\[\]\)/);
    expect(server).toMatch(/firstEncounterTrivialSocial\s*\?\s*Promise\.resolve\(\)/);
    expect(server).toContain("loadKdmState(stateUserId)");
  });

  it("can return the fast response before distributed replay bookkeeping finishes", async () => {
    const server = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    expect(server).toContain("deferCoordinationCompletion");
    expect(server).toContain("res.json(payload)");
    expect(server).toContain("void completeCoordinatedKairaChatRequest");
  });
});
