import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("first-encounter coordination/semantic overlap latency", () => {
  it("starts first-encounter coordination before semantic work without awaiting it", async () => {
    const source = await readFile(new URL("../../server.ts", import.meta.url), "utf8");

    const promiseStart = source.indexOf("const coordinationClaimPromise = coordinationKey");
    const immediateGate = source.indexOf(
      "if (coordinationClaimPromise && !canOverlapFirstEncounterCoordination)",
      promiseStart,
    );
    const semanticStart = source.indexOf("const semanticStart = now();", immediateGate);
    const semanticResolve = source.indexOf(
      "const languageUnderstanding = await resolveServerLanguageUnderstanding",
      semanticStart,
    );

    expect(promiseStart).toBeGreaterThan(-1);
    expect(immediateGate).toBeGreaterThan(promiseStart);
    expect(semanticStart).toBeGreaterThan(immediateGate);
    expect(semanticResolve).toBeGreaterThan(semanticStart);

    const betweenPromiseAndSemantic = source.slice(promiseStart, semanticStart);
    expect(betweenPromiseAndSemantic).not.toContain(
      "if (coordinationClaimPromise && canOverlapFirstEncounterCoordination)",
    );
  });

  it("awaits coordination after semantic resolution and before canonical downstream work", async () => {
    const source = await readFile(new URL("../../server.ts", import.meta.url), "utf8");

    const semanticResolve = source.indexOf(
      "const languageUnderstanding = await resolveServerLanguageUnderstanding",
    );
    const semanticDone = source.indexOf(
      "const semanticMs = Math.round(now() - semanticStart);",
      semanticResolve,
    );
    const deferredAwait = source.indexOf(
      "if (coordinationClaimPromise && canOverlapFirstEncounterCoordination)",
      semanticDone,
    );
    const settle = source.indexOf("if (await settleCoordinationClaim()) return;", deferredAwait);
    const canonical = source.indexOf("const canonicalSemantic = {", settle);

    expect(semanticResolve).toBeGreaterThan(-1);
    expect(semanticDone).toBeGreaterThan(semanticResolve);
    expect(deferredAwait).toBeGreaterThan(semanticDone);
    expect(settle).toBeGreaterThan(deferredAwait);
    expect(canonical).toBeGreaterThan(settle);
  });

  it("keeps replay/wait handling inside the coordination settlement boundary", async () => {
    const source = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    const helperStart = source.indexOf("const settleCoordinationClaim = async () =>");
    const helperEnd = source.indexOf("const assertStateMutationOwnership", helperStart);
    const helper = source.slice(helperStart, helperEnd);

    expect(helper).toContain('if (claim.kind === "replay")');
    expect(helper).toContain('if (claim.kind === "wait")');
    expect(helper).toContain("ownsCoordinationClaim = true");
    expect(helper).toContain("res.json(claim.payload)");
  });

  it("does not overlap coordination when resolving an explicit activity-permission reply", async () => {
    const source = await readFile(new URL("../../server.ts", import.meta.url), "utf8");
    const gateStart = source.indexOf("const canOverlapFirstEncounterCoordination");
    const gateEnd = source.indexOf("const coordinationStartedAt", gateStart);
    const gate = source.slice(gateStart, gateEnd);

    expect(gate).toContain('conversationPhase === "first_encounter"');
    expect(gate).toContain("kairaPolicy.autonomousActivityPlanning");
    expect(gate).toContain("incomingActivityPermissionRequestId");
  });
});
