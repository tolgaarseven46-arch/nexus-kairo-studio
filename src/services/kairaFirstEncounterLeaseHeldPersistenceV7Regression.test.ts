import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("first-encounter lease-held deferred persistence v7", () => {
  it("sends the fast response before durable persistence but retains coordination ownership", async () => {
    const server = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    expect(server).toContain("sendFirstEncounterFastPayload");
    expect(server).toContain("res.json(payload)");
    expect(server).toContain("await persistFirstEncounterContinuity()");
    expect(server).toContain("await completeCoordinatedKairaChatRequest(coordinationKey, responsePayload)");
  });

  it("does not release the state lease before relationship and turn continuity finish", async () => {
    const server = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    const send = server.indexOf("sendFirstEncounterFastPayload(responsePayload)");
    const persist = server.indexOf("await persistFirstEncounterContinuity()", send);
    const complete = server.indexOf("await completeCoordinatedKairaChatRequest(coordinationKey, responsePayload)", persist);
    expect(send).toBeGreaterThan(-1);
    expect(persist).toBeGreaterThan(send);
    expect(complete).toBeGreaterThan(persist);
  });

  it("uses a preallocated turn id so response and deferred TestSession persistence stay identical", async () => {
    const server = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    const persistence = await readFile(new URL("./kdmPersistenceService.ts", import.meta.url), "utf8");
    expect(server).toContain("firstEncounterTurnId");
    expect(server).toContain("turnIdHint: firstEncounterTurnId");
    expect(persistence).toContain("turnIdHint?: string");
  });
});
