import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const integration = fs.readFileSync(
  path.resolve(process.cwd(), "src/services/behaviorIntegrationEngine.ts"),
  "utf8",
);
const kdm = fs.readFileSync(
  path.resolve(process.cwd(), "src/services/kdmConsistencyEngine.ts"),
  "utf8",
);

describe("KAIRA decision-layer architecture contracts", () => {
  it("reads dynamic relationship/emotion state as guidance input", () => {
    expect(integration).toContain("const relationship = input.dynamicState?.relationship");
    expect(integration).toContain("const hurt = clamp01((relationship?.hurtScore ?? 0) / 100)");
    expect(integration).toContain("const conflict = clamp01((relationship?.conflictScore ?? 0) / 100)");
    expect(integration).toContain("const anger = clamp01((input.dynamicState?.anger ?? 0) / 100)");
    expect(integration).toContain("const stress = clamp01((input.dynamicState?.stress ?? 0) / 100)");
  });

  it("produces behavioral runtime guidance instead of a second dynamic state", () => {
    expect(integration).toContain("runtimeContinueConversation: decision.continueConversation ? 100 : 0");
    expect(integration).toContain("runtimeHumorAllowed: decision.humorAllowed ? 100 : 0");
    expect(integration).toContain("runtimeAskQuestion: decision.askQuestion ? 100 : 0");
    expect(integration).toContain("runtimeStance: stanceCode[decision.stance]");
    expect(integration).toContain("runtimePriority: priorityCode[decision.priority]");
    expect(integration).not.toContain("nextDynamicState:");
  });

  it("feeds those runtime decisions back into KDM behavior enforcement", () => {
    expect(kdm).toContain('runtimeTrait(personality, "runtimeContinueConversation", 100)');
    expect(kdm).toContain('runtimeTrait(personality, "runtimeStance", 25)');
    expect(kdm).toContain('runtimeTrait(personality, "runtimePriority", 20)');
    expect(kdm).toContain('runtimeTrait(personality, "runtimeRepairSignal", 0)');
    expect(kdm).toContain("applyIntegratedRuntimeDecision");
  });

  it("keeps decision priority ordered so boundaries can override softer layers", () => {
    const boundary = integration.indexOf('priority = "boundary"');
    const values = integration.indexOf('priority = "values"');
    const relationship = integration.indexOf('priority = "relationship"');
    const goal = integration.indexOf('priority = "goal"');
    const preference = integration.indexOf('priority = "preference"');

    expect(boundary).toBeGreaterThan(0);
    expect(values).toBeGreaterThan(boundary);
    expect(relationship).toBeGreaterThan(values);
    expect(goal).toBeGreaterThan(relationship);
    expect(preference).toBeGreaterThan(goal);
  });
});
