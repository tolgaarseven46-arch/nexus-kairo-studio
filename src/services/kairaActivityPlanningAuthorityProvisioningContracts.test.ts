import { beforeEach, describe, expect, it, vi } from "vitest";

const catalog = vi.hoisted(() => ({ provision: vi.fn() }));
const environment = vi.hoisted(() => ({ provision: vi.fn() }));
const dynamicState = vi.hoisted(() => ({ provision: vi.fn() }));

vi.mock("./kairaActivityCatalogStore", () => ({
  provisionKairaActivityCatalogIfMissingAtomic: catalog.provision,
}));
vi.mock("./kairaActivityEnvironmentStore", () => ({
  provisionOrRefreshKairaActivityEnvironmentAtomic: environment.provision,
}));
vi.mock("./kairaActivityDynamicStateStore", () => ({
  provisionKairaActivityDynamicStateIfMissingAtomic: dynamicState.provision,
}));

import {
  BUILTIN_ACTIVITY_CATALOG_VERSION,
  provisionKairaActivityPlanningAuthorities,
} from "./kairaActivityPlanningAuthorityProvisioning";

const record = {
  schemaVersion: 1 as const,
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  trigger: {
    triggerId: "terminal_1",
    kind: "execution_terminal" as const,
    sourceId: "activity:a",
    occurredAt: "2026-09-02T02:00:00.000Z",
    terminalPhase: "completed" as const,
  },
  status: "pending" as const,
  enqueuedAt: "2026-09-02T02:00:01.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  catalog.provision.mockResolvedValue({ status: "provisioned" });
  environment.provision.mockResolvedValue({ status: "provisioned" });
  dynamicState.provision.mockResolvedValue({ status: "provisioned" });
});

describe("Kaira activity planning authority provisioning contracts", () => {
  it("provisions deterministic authorities under the real inbox instance owner", async () => {
    const now = "2026-09-02T02:05:00.000Z";
    await provisionKairaActivityPlanningAuthorities({ record, now });
    expect(catalog.provision).toHaveBeenCalledWith(expect.objectContaining({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      catalogVersion: BUILTIN_ACTIVITY_CATALOG_VERSION,
      publishedAt: now,
    }));
    expect(environment.provision).toHaveBeenCalledWith(expect.objectContaining({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      snapshot: expect.objectContaining({ kairaInstanceId: "kaira_a", observedAt: now }),
    }));
    expect(dynamicState.provision).toHaveBeenCalledWith(expect.objectContaining({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      observedAt: now,
      sourceId: "authority_bootstrap:autonomous_builtin_v1",
    }));
  });
});
