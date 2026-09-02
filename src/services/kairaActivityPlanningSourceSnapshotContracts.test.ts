import { beforeEach, describe, expect, it, vi } from "vitest";

const catalog = vi.hoisted(() => ({ load: vi.fn() }));
const environment = vi.hoisted(() => ({ load: vi.fn() }));
const occupancy = vi.hoisted(() => ({ read: vi.fn() }));
const dynamicState = vi.hoisted(() => ({ load: vi.fn() }));

vi.mock("./kairaActivityCatalogStore", () => ({ loadActiveKairaActivityCatalog: catalog.load }));
vi.mock("./kairaActivityEnvironmentStore", () => ({ loadKairaActivityEnvironmentSnapshot: environment.load }));
vi.mock("./kairaActivityOccupancyReadModel", () => ({ readKairaActivityOccupancySnapshot: occupancy.read }));
vi.mock("./kairaActivityDynamicStateStore", () => ({ loadKairaActivityDynamicState: dynamicState.load }));

import { readKairaActivityPlanningSourceSnapshot } from "./kairaActivityPlanningSourceSnapshot";

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
  catalog.load.mockResolvedValue({ catalogVersion: "v1", entries: [{ catalogId: "a" }] });
  environment.load.mockResolvedValue({ schemaVersion: 1, kairaInstanceId: "kaira_a", observedAt: "2026-09-02T02:00:00.000Z", entries: [] });
  occupancy.read.mockResolvedValue({ ownerUserId: "owner_1", kairaInstanceId: "kaira_a", openExecutions: [], scheduledActivities: [] });
  dynamicState.load.mockResolvedValue({ state: { calmness: 70, anger: 10, stress: 20, happiness: 70, confidence: 70, surprise: 10, lastStatus: "stable" } });
});

describe("Kaira activity planning source snapshot contracts", () => {
  it("assembles only canonical authorities for the trigger owner", async () => {
    const result = await readKairaActivityPlanningSourceSnapshot({ record, occupancyBatchSize: 33 });
    expect(result.status).toBe("ready");
    expect(environment.load).toHaveBeenCalledWith({ kairaInstanceId: "kaira_a", instanceType: "individual" });
    expect(occupancy.read).toHaveBeenCalledWith({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      executionBatchSize: 33,
      scheduleBatchSize: 33,
    });
    expect(dynamicState.load).toHaveBeenCalledWith({ kairaInstanceId: "kaira_a" });
    if (result.status === "ready") {
      expect(result.catalogVersion).toBe("v1");
      expect(result.activeExecutions).toEqual([]);
      expect(result.schedules).toEqual([]);
      expect(result.dynamicState.relationship).toBeUndefined();
    }
  });

  it.each([
    ["catalog_missing", "catalog"],
    ["environment_missing", "environment"],
    ["dynamic_state_missing", "dynamicState"],
  ] as const)("fails closed with %s instead of inventing defaults", async (reason, source) => {
    if (source === "catalog") catalog.load.mockResolvedValue(null);
    if (source === "environment") environment.load.mockResolvedValue(null);
    if (source === "dynamicState") dynamicState.load.mockResolvedValue(null);
    await expect(readKairaActivityPlanningSourceSnapshot({ record })).resolves.toEqual({
      status: "unavailable",
      reason,
    });
  });

  it("propagates occupancy read failure rather than treating Kaira as idle", async () => {
    occupancy.read.mockRejectedValue(new Error("occupancy read failed"));
    await expect(readKairaActivityPlanningSourceSnapshot({ record })).rejects.toThrow("occupancy read failed");
  });
});
