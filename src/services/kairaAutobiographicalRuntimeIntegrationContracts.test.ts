import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Kaira autobiographical runtime integration contracts", () => {
  const server = readFileSync("server.ts", "utf8");

  it("consumes only the canonical semantic self-memory facet", () => {
    expect(server).toContain('from "./src/services/kairaAutobiographicalRecallRuntime"');
    expect(server).toContain('from "./src/services/kairaAutobiographicalResponseGuard"');
    expect(server).toContain("resolveKairaAutobiographicalRecallRuntime({");
    expect(server).toContain("query: canonicalSemantic.event.selfMemoryQuery");
    expect(server).not.toContain("inferFallbackSelfMemoryQuery");
    expect(server).not.toContain("loadKairaCanonicalIdentityResult");
    expect(server).not.toContain("loadKairaCanonicalIdentity(");
  });

  it("bypasses local short-circuit when canonical self-memory grounding is active", () => {
    expect(server).toContain("if (!selfMemoryInstruction && local.handled && local.reply) {");
    expect(server).toContain("${selfMemoryInstruction}\\n${dialogueInstruction}");
  });

  it("guards generated and post-enforcement fallback replies against unsupported autobiography", () => {
    expect(server).toContain(
      "const selfMemoryGuard = enforceKairaAutobiographicalResponse(reply, selfMemoryRuntime);",
    );
    expect(server).toContain(
      "const candidateSelfMemoryGuard = enforceKairaAutobiographicalResponse(candidateWorldGuard.reply, selfMemoryRuntime);",
    );
    expect(server).toContain(
      "const candidateEpistemicGuard = enforceKairaEpistemicResponse(candidateSelfMemoryGuard.reply, epistemicAccess);",
    );
    expect(server).toContain("worldMemoryGuard.changed || selfMemoryGuard.changed || epistemicGuard.changed");
  });

  it("exposes the typed recall decision in session metadata and API KDM output", () => {
    const occurrences = server.split("selfMemoryRuntime").length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(8);
    expect(server).toContain("epistemicAccess, selfMemoryRuntime, behaviorContract");
    expect(server).toContain("epistemicAccess,\n          selfMemoryRuntime,\n          responsePlan,");
  });

  it("does not create a second downstream self-memory parser", () => {
    const consumerRegion = server.slice(server.indexOf('app.post("/api/chat"'));
    expect(consumerRegion).not.toMatch(/selfMemory.*RegExp|SELF_MEMORY_RE|selfMemory.*\.test\(userMessage/i);
  });
});
