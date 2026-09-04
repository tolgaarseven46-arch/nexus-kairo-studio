import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Kaira autobiographical runtime integration contracts", () => {
  const server = readFileSync("server.ts", "utf8");
  const unifiedPass = readFileSync("src/services/kairaResponseConstraintPass.ts", "utf8");

  it("consumes only the canonical semantic self-memory facet", () => {
    expect(server).toContain('from "./src/services/kairaAutobiographicalRecallRuntime"');
    expect(server).toContain('from "./src/services/kairaAutobiographicalResponseGuard"');
    expect(server).toContain("resolveKairaAutobiographicalRecallRuntime({");
    expect(server).toContain("query: canonicalSemantic.event.selfMemoryQuery");
    expect(server).not.toContain("inferFallbackSelfMemoryQuery");
    expect(server).not.toContain("loadKairaCanonicalIdentityResult");
    expect(server).not.toContain("loadKairaCanonicalIdentity(");
  });

  it("bypasses local short-circuit and places self-memory grounding before dialogue grounding", () => {
    expect(server).toContain("if (!selfMemoryInstruction && local.handled && local.reply) {");
    const selfMemoryIndex = server.indexOf("${selfMemoryInstruction}");
    const dialogueIndex = server.indexOf("${dialogueInstruction}", selfMemoryIndex);
    expect(selfMemoryIndex).toBeGreaterThan(-1);
    expect(dialogueIndex).toBeGreaterThan(selfMemoryIndex);
  });

  it("guards generated and caller-supplied fallback replies against unsupported autobiography through the canonical pass", () => {
    expect(server).not.toContain('isCanonicalBehaviorFlagEnabled("UNIFIED_GUARD_PASS")');
    expect(server).toContain("runKairaResponseConstraintPass({");
    expect(server).toContain("selfMemoryRuntime,");
    expect(server).toContain("canonicalConstraint?.autobiographicalGuard ?? enforceKairaAutobiographicalResponse(reply, selfMemoryRuntime)");
    expect(server).toContain("fallbackFactory: () =>");

    const worldIndex = unifiedPass.indexOf("enforceWorldModelRecallResponse(");
    const selfMemoryIndex = unifiedPass.indexOf("enforceKairaAutobiographicalResponse(");
    const epistemicIndex = unifiedPass.indexOf("enforceKairaEpistemicResponse(");
    const planIndex = unifiedPass.indexOf("enforceKairoResponse(");
    expect(worldIndex).toBeGreaterThan(-1);
    expect(selfMemoryIndex).toBeGreaterThan(worldIndex);
    expect(epistemicIndex).toBeGreaterThan(selfMemoryIndex);
    expect(planIndex).toBeGreaterThan(epistemicIndex);
    expect(unifiedPass).not.toContain('runOrderedPass("tamam", input)');
  });

  it("exposes the typed recall decision in session metadata and API KDM output", () => {
    const occurrences = server.split("selfMemoryRuntime").length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(8);
    expect(server).toMatch(/epistemicAccess\s*,\s*selfMemoryRuntime\s*,\s*(?:livedMemoryRuntime\s*,\s*)?behaviorContract/);
    expect(server).toMatch(/epistemicAccess\s*,\s*selfMemoryRuntime\s*,\s*(?:livedMemoryRuntime\s*,\s*)?responsePlan/);
  });

  it("does not create a second downstream self-memory parser", () => {
    const consumerRegion = server.slice(server.indexOf('app.post("/api/chat"'));
    expect(consumerRegion).not.toMatch(/selfMemory.*RegExp|SELF_MEMORY_RE|selfMemory.*\.test\(userMessage/i);
  });
});
