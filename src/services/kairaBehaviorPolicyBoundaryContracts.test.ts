import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const client = read("src/services/droitChatService.ts");
const server = read("server.ts");
const kdm = read("src/services/kdmConsistencyEngine.ts");
const policy = read("src/services/behaviorPolicyInput.ts");

describe("explicit behavior policy boundary", () => {
  it("defines a versioned and validated client behavior policy contract", () => {
    expect(policy).toContain('BEHAVIOR_POLICY_SCHEMA_VERSION = "behavior-policy@1"');
    expect(policy).toContain('CLIENT_BEHAVIOR_POLICY_SOURCE = "client_behavior_integration"');
    expect(policy).toContain("normalizeBehaviorPolicyInput");
  });

  it("sends integrated behavior as explicit policy instead of standalone hidden decision fields", () => {
    expect(client).toContain("createClientBehaviorPolicy(integrationRuntime.decision, integrationRuntime.pressures)");
    expect(client).toContain("behaviorPolicy,");
    expect(client).not.toContain("behaviorDecision: integrationRuntime.decision, behaviorPressures: integrationRuntime.pressures");
  });

  it("validates the explicit policy at the server boundary and passes it to KDM", () => {
    expect(server).toContain("normalizeBehaviorPolicyInput(incomingBehaviorPolicy)");
    expect(server).toContain("behaviorPolicy: incomingBehaviorPolicy");
    expect(server).toMatch(/analyzeKdmInteraction\([\s\S]*canonicalSemantic\.event,\s*behaviorPolicy,\s*\)/u);
  });

  it("does not recover live integrated decisions from personality runtime fields inside KDM", () => {
    expect(kdm).toContain("behaviorPolicy?: BehaviorPolicyInput | null");
    expect(kdm).not.toContain('runtimeTrait(personality, "runtimeContinueConversation"');
    expect(kdm).not.toContain('runtimeTrait(personality, "runtimeHumorAllowed"');
    expect(kdm).not.toContain('runtimeTrait(personality, "runtimeAskQuestion"');
    expect(kdm).not.toContain('runtimeTrait(personality, "runtimePriority"');
    expect(kdm).not.toContain('runtimeTrait(personality, "runtimeStance"');
    expect(kdm).not.toContain('runtimeTrait(personality, "runtimeRepairSignal"');
  });

  it("keeps the policy explicitly upstream of BehaviorContract and KairaResponsePlan", () => {
    expect(server.indexOf("behaviorPolicy = normalizeBehaviorPolicyInput"))
      .toBeLessThan(server.indexOf("behaviorContract = buildBehaviorContract"));
    expect(server.indexOf("behaviorContract = buildBehaviorContract"))
      .toBeLessThan(server.indexOf("responsePlan = buildKairaResponsePlan"));
  });
});
