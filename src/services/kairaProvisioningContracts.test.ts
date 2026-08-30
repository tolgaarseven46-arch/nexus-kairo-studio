import { describe, expect, it } from "vitest";
import {
  buildKairaIdentityTestFixture,
  validateKairaIdentitySeed,
} from "./kairaIdentityContracts";
import {
  advanceKairaProvisioning,
  canProvisioningStatePersistLife,
  startIndividualKairaProvisioning,
  welcomeKairaForServer,
} from "./kairaProvisioning";
import { instancePolicy } from "./kairaInstanceContext";

describe("Kaira provisioning contracts", () => {
  it("creates a lightweight server-specific Welcome Kaira", () => {
    const welcome = welcomeKairaForServer("server-42");
    expect(welcome.instanceType).toBe("welcome");
    expect(welcome.instanceId).toBe("welcome_server-42");
    expect(instancePolicy(welcome.instanceType).persistentAutobiography).toBe(false);
  });

  it("does not allow an Individual Kaira to own life state before readiness", () => {
    const state = startIndividualKairaProvisioning({
      requestId: "req-1",
      ownerUserId: "user-1",
      targetServerId: "server-1",
      instanceId: "kaira-1001",
      requestedAt: "2026-08-30T10:00:00.000Z",
      estimatedMinutes: 10,
    });
    expect(state.estimatedReadyAt).toBe("2026-08-30T10:10:00.000Z");
    expect(canProvisioningStatePersistLife(state)).toBe(false);
  });

  it("moves forward monotonically and enables durable life only when ready", () => {
    let state = startIndividualKairaProvisioning({
      requestId: "req-2",
      ownerUserId: "user-1",
      targetServerId: "server-1",
      instanceId: "kaira-1002",
    });
    for (const stage of ["identity_seed", "knowledge_profile", "life_scaffold", "validation", "assignment", "ready"] as const) {
      const previousProgress = state.progress;
      state = advanceKairaProvisioning(state, stage);
      expect(state.progress).toBeGreaterThanOrEqual(previousProgress);
    }
    expect(state.stage).toBe("ready");
    expect(state.progress).toBe(100);
    expect(canProvisioningStatePersistLife(state)).toBe(true);
  });

  it("keeps temporary lore explicitly marked as a test fixture", () => {
    const seed = buildKairaIdentityTestFixture("fixture-kaira");
    expect(seed.isTestFixture).toBe(true);
    expect(validateKairaIdentitySeed(seed)).toEqual([]);
    expect(seed.inheritedMemories[0]).not.toHaveProperty("narrationText");
  });
});
