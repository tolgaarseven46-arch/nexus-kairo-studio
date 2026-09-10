import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("KDM effective-state server wiring contract", () => {
  it("routes request/persisted arbitration through the canonical selector", () => {
    const server = readFileSync("server.ts", "utf8");
    expect(server).toContain('import { selectEffectiveKdmDynamicState } from "./src/services/kdmEffectiveStateSelector";');
    expect(server).toContain("effective = selectEffectiveKdmDynamicState({");
    expect(server).toContain("persistedState: kairaPolicy.persistentRelationship ? persistedState : null");
    expect(server).toContain("requestHasRelationship: Boolean(dynamicState?.relationship)");
    expect(server).not.toContain("effective = dynamicState?.relationship");
  });
});
