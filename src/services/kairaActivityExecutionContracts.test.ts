import { describe, expect, it } from "vitest";
import {
  createKairaActivityExecution,
  transitionKairaActivityExecution,
} from "./kairaActivityExecution";

const planned = (permissionPolicy: "none" | "owner_approval" = "none") =>
  createKairaActivityExecution({
    ownerUserId: "owner_1",
    kairaInstanceId: "kaira_a",
    instanceType: "individual",
    activityId: "theatre_01",
    activityType: "theatre",
    permissionPolicy,
    now: "2026-09-02T00:00:00.000Z",
  });

describe("Kaira activity execution contracts", () => {
  it("starts a permission-free planned activity and completes only after active", () => {
    const start = transitionKairaActivityExecution(
      planned(),
      { type: "start", authority: "kaira_activity_executor" },
      "2026-09-02T00:01:00.000Z",
    );
    expect(start.status).toBe("applied");
    if (start.status !== "applied") return;
    expect(start.record.phase).toBe("active");

    const complete = transitionKairaActivityExecution(
      start.record,
      { type: "complete", authority: "kaira_activity_executor" },
      "2026-09-02T00:20:00.000Z",
    );
    expect(complete.status).toBe("applied");
    if (complete.status !== "applied") return;
    expect(complete.record.phase).toBe("completed");
    expect(complete.record.completedAt).toBe("2026-09-02T00:20:00.000Z");
  });

  it("does not start an owner-approved activity while permission is pending", () => {
    const result = transitionKairaActivityExecution(
      planned("owner_approval"),
      { type: "start", authority: "kaira_activity_executor" },
      "2026-09-02T00:01:00.000Z",
    );
    expect(result).toMatchObject({ status: "rejected", reason: "permission_required" });
  });

  it("requires the actual owner to grant permission", () => {
    const record = planned("owner_approval");
    const wrongOwner = transitionKairaActivityExecution(
      record,
      {
        type: "grant_permission",
        authority: "activity_permission_controller",
        decidedByUserId: "owner_2",
      },
      "2026-09-02T00:01:00.000Z",
    );
    expect(wrongOwner).toMatchObject({ status: "rejected", reason: "permission_owner_mismatch" });

    const granted = transitionKairaActivityExecution(
      record,
      {
        type: "grant_permission",
        authority: "activity_permission_controller",
        decidedByUserId: "owner_1",
      },
      "2026-09-02T00:02:00.000Z",
    );
    expect(granted.status).toBe("applied");
    if (granted.status !== "applied") return;
    expect(granted.record.permissionStatus).toBe("granted");
    expect(
      transitionKairaActivityExecution(
        granted.record,
        { type: "start", authority: "kaira_activity_executor" },
        "2026-09-02T00:03:00.000Z",
      ).status,
    ).toBe("applied");
  });

  it("keeps denied permission closed instead of silently converting it to approval", () => {
    const denied = transitionKairaActivityExecution(
      planned("owner_approval"),
      {
        type: "deny_permission",
        authority: "activity_permission_controller",
        decidedByUserId: "owner_1",
      },
      "2026-09-02T00:01:00.000Z",
    );
    expect(denied.status).toBe("applied");
    if (denied.status !== "applied") return;
    expect(denied.record.permissionStatus).toBe("denied");
    expect(
      transitionKairaActivityExecution(
        denied.record,
        { type: "start", authority: "kaira_activity_executor" },
        "2026-09-02T00:02:00.000Z",
      ),
    ).toMatchObject({ status: "rejected", reason: "permission_required" });
    expect(
      transitionKairaActivityExecution(
        denied.record,
        {
          type: "grant_permission",
          authority: "activity_permission_controller",
          decidedByUserId: "owner_1",
        },
        "2026-09-02T00:03:00.000Z",
      ),
    ).toMatchObject({ status: "rejected", reason: "permission_already_decided" });
  });

  it("does not complete a merely planned activity", () => {
    expect(
      transitionKairaActivityExecution(
        planned(),
        { type: "complete", authority: "kaira_activity_executor" },
        "2026-09-02T00:02:00.000Z",
      ),
    ).toMatchObject({ status: "rejected", reason: "invalid_phase" });
  });

  it("keeps terminal activity states immutable", () => {
    const active = transitionKairaActivityExecution(
      planned(),
      { type: "start", authority: "kaira_activity_executor" },
      "2026-09-02T00:01:00.000Z",
    );
    if (active.status !== "applied") throw new Error("expected active");
    const completed = transitionKairaActivityExecution(
      active.record,
      { type: "complete", authority: "kaira_activity_executor" },
      "2026-09-02T00:02:00.000Z",
    );
    if (completed.status !== "applied") throw new Error("expected completed");
    expect(
      transitionKairaActivityExecution(
        completed.record,
        { type: "start", authority: "kaira_activity_executor" },
        "2026-09-02T00:03:00.000Z",
      ),
    ).toMatchObject({ status: "rejected", reason: "terminal_activity" });
  });

  it("does not create persistent activity execution for Welcome Kaira", () => {
    expect(() =>
      createKairaActivityExecution({
        ownerUserId: "owner_1",
        kairaInstanceId: "welcome_1",
        instanceType: "welcome",
        activityId: "theatre_01",
        activityType: "theatre",
        now: "2026-09-02T00:00:00.000Z",
      }),
    ).toThrow("cannot own activity execution");
  });
});
