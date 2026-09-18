import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("first-encounter critical-path latency v3", () => {
  it("keeps unrelated activity-permission and social-appraisal I/O off trivial first-encounter critical path", async () => {
    const server = await readFile(new URL("../../server.ts", import.meta.url), "utf8");

    expect(server).toContain("let firstEncounterTrivialSocial = false");
    expect(server).toContain("firstEncounterTrivialSocial =");
    expect(server).toContain("conversationPhase === \"first_encounter\"");
    expect(server).toContain("canonicalSemantic.event.socialRoutine");

    expect(server).toContain("!firstEncounterTrivialSocial");
    expect(server).toContain("incomingActivityPermissionRequestId");
    expect(server).toContain("loadSocialAppraisalAutobiographicalRuntime");
    expect(server).toMatch(
      /firstEncounterTrivialSocial[\s\S]{0,260}?memory:\s*undefined[\s\S]{0,420}?loadSocialAppraisalAutobiographicalRuntime/,
    );
  });

  it("preserves relationship and TestRun continuity writes before the fast response", async () => {
    const server = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    const fast = server.indexOf("const firstEncounterFastPersistence");
    const critical = server.indexOf("await Promise.all([", fast);
    const send = server.indexOf("await sendChatPayload({", fast);

    expect(fast).toBeGreaterThan(-1);
    expect(critical).toBeGreaterThan(fast);
    expect(send).toBeGreaterThan(critical);
    expect(server).toContain("saveRelationshipState()");
    expect(server).toContain("saveTurnContinuity()");
  });
});
