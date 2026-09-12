import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("semantic fallback production reachability contracts", () => {
  it("client production behavior integration always supplies canonical semanticEvent", () => {
    const source = read("src/services/droitChatService.ts");
    const call = source.match(/integrateBehaviorLayers\(\{[\s\S]*?\n\s*\}\);/m)?.[0] ?? "";

    expect(call).toContain("semanticEvent,");
    expect(call).toContain("personality:");
    expect(call).toContain("boundaries:");
  });

  it("server production dialogue planning supplies languageUnderstanding.event at every call site", () => {
    const source = read("server.ts");
    const callSiteCount = source.match(/planDialogueResponse\(/g)?.length ?? 0;
    const calls = [...source.matchAll(/planDialogueResponse\([\s\S]*?\n\s*\);/g)].map((match) => match[0]);

    expect(callSiteCount).toBeGreaterThan(0);
    expect(calls).toHaveLength(callSiteCount);
    for (const call of calls) {
      expect(call).toContain("languageUnderstanding.event");
    }
  });

  it("consumer fallbacks remain explicit compatibility branches, not hidden production authority", () => {
    const behavior = read("src/services/behaviorIntegrationEngine.ts");
    const dialogue = read("src/services/kairoDialogueDecisionEngine.ts");

    expect(behavior).toContain(
      'input.semanticEvent ?? interpretSemanticEvent(input.userMessage ?? "")',
    );
    expect(dialogue).toContain("semanticEvent ?? interpretSemanticEvent(userMessage)");
  });
});
