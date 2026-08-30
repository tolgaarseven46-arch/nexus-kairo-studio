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
const policy = fs.readFileSync(
  path.resolve(process.cwd(), "src/services/behaviorPolicyInput.ts"),
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

  it("produces behavioral guidance instead of a second dynamic state", () => {
    expect(integration).toContain("const decision: IntegratedBehaviorDecision = {");
    expect(integration).toContain("continueConversation: !disengage");
    expect(integration).toContain("humorAllowed,");
    expect(integration).toContain("askQuestion,");
    expect(integration).not.toContain("nextDynamicState:");
  });

  it("feeds integrated decisions into KDM through the explicit behavior policy boundary", () => {
    expect(policy).toContain('BEHAVIOR_POLICY_SCHEMA_VERSION = "behavior-policy@1"');
    expect(kdm).toContain('import type { BehaviorPolicyInput } from "./behaviorPolicyInput"');
    expect(kdm).toContain("behaviorPolicy?: BehaviorPolicyInput | null");
    expect(kdm).toContain("const integratedDecision = behaviorPolicy?.decision");
    expect(kdm).toContain("applyIntegratedBehaviorPolicy");
    expect(kdm).not.toContain("applyIntegratedRuntimeDecision");
    expect(kdm).not.toContain('runtimeTrait(personality, "runtimeContinueConversation"');
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
