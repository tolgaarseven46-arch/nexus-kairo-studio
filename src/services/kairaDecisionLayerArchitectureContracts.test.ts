import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
describe("KAIRA decision-layer architecture contracts",()=>{
 it("keeps guidance separate from dynamic-state authority",()=>{const i=readFileSync("src/services/behaviorIntegrationEngine.ts","utf8"); expect(i).toContain("const decision: IntegratedBehaviorDecision = {"); expect(i).not.toContain("nextDynamicState:");});
 it("feeds behavior policy through the explicit KDM boundary",()=>{const k=readFileSync("src/services/kdmConsistencyEngine.ts","utf8"); expect(k).toContain('import type { BehaviorPolicyInput } from "./behaviorPolicyInput"'); expect(k).toContain("const decision = behaviorPolicy?.decision"); expect(k).toContain("applyIntegratedBehaviorPolicy"); expect(k).not.toContain("applyIntegratedRuntimeDecision");});
 it("keeps boundary priority ahead of softer choices",()=>{const i=readFileSync("src/services/behaviorIntegrationEngine.ts","utf8"); const b=i.indexOf('priority = "boundary"'),v=i.indexOf('priority = "values"'),r=i.indexOf('priority = "relationship"'); expect(b).toBeGreaterThan(0); expect(v).toBeGreaterThan(b); expect(r).toBeGreaterThan(v);});
});
