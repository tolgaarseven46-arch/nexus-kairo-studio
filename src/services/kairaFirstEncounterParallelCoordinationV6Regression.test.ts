import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("first-encounter parallel coordination latency v6", () => {
  it("starts state-lease acquisition and distributed idempotency claim concurrently", async () => {
    const coordinator = await readFile(new URL("./kairaChatIdempotencyCoordinator.ts", import.meta.url), "utf8");
    expect(coordinator).toContain("const stateMutationPromise = acquireStateMutation(normalizedKey)");
    expect(coordinator).toContain("const claimPromise = distributed.claim(normalizedKey)");
    expect(coordinator).toContain("const claim = await claimPromise");
    expect(coordinator).toContain("await stateMutationPromise");
  });

  it("prefetches relationship state in parallel with semantic understanding", async () => {
    const server = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    expect(server).toContain("const persistedStatePromise =");
    expect(server).toContain("loadKdmState(stateUserId)");
    expect(server).toContain("const languageUnderstanding = await resolveServerLanguageUnderstanding");
    expect(server).toMatch(/Promise\.all\(\[\s*persistedStatePromise,/);
  });
});
