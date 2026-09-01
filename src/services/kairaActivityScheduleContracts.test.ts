import { describe, expect, it } from "vitest";
import {
  cancelKairaActivitySchedule,
  createKairaActivitySchedule,
  evaluateKairaActivitySchedule,
  markKairaActivityScheduleDispatched,
} from "./kairaActivitySchedule";

const schedule = (overrides: Record<string, unknown> = {}) => ({
  ...createKairaActivitySchedule({
    ownerUserId: "owner_1",
    kairaInstanceId: "kaira_a",
    instanceType: "individual",
    activityId: "theatre_01",
    notBefore: "2026-09-02T01:00:00.000Z",
    expiresAt: "2026-09-02T02:00:00.000Z",
    now: "2026-09-02T00:00:00.000Z",
  }),
  ...overrides,
});

describe("Kaira activity schedule contracts", () => {
  it("is not due before notBefore and due at the boundary", () => {
    expect(evaluateKairaActivitySchedule(schedule(), "2026-09-02T00:59:59.000Z").status).toBe("not_due");
    expect(evaluateKairaActivitySchedule(schedule(), "2026-09-02T01:00:00.000Z").status).toBe("due");
  });

  it("treats a schedule created after its notBefore as immediately due when not expired", () => {
    expect(evaluateKairaActivitySchedule(schedule(), "2026-09-02T01:30:00.000Z").status).toBe("due");
  });

  it("expires after the explicit expiry instead of dispatching stale work", () => {
    expect(evaluateKairaActivitySchedule(schedule(), "2026-09-02T02:00:01.000Z").status).toBe("expired");
  });

  it("marks due work dispatched exactly once", () => {
    const dispatched = markKairaActivityScheduleDispatched(schedule(), "2026-09-02T01:00:00.000Z");
    expect(dispatched.status).toBe("dispatched");
    expect(dispatched.dispatchedAt).toBe("2026-09-02T01:00:00.000Z");
    expect(markKairaActivityScheduleDispatched(dispatched, "2026-09-02T01:05:00.000Z")).toBe(dispatched);
  });

  it("does not cancel a schedule after dispatch", () => {
    const dispatched = markKairaActivityScheduleDispatched(schedule(), "2026-09-02T01:00:00.000Z");
    expect(() => cancelKairaActivitySchedule(dispatched, "2026-09-02T01:05:00.000Z")).toThrow("cannot be cancelled");
  });

  it("keeps cancellation terminal for scheduler authority", () => {
    const cancelled = cancelKairaActivitySchedule(schedule(), "2026-09-02T00:30:00.000Z");
    expect(evaluateKairaActivitySchedule(cancelled, "2026-09-02T01:30:00.000Z").status).toBe("cancelled");
    expect(cancelKairaActivitySchedule(cancelled, "2026-09-02T00:40:00.000Z")).toBe(cancelled);
  });

  it("rejects invalid expiry ordering", () => {
    expect(() => createKairaActivitySchedule({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      activityId: "theatre_01",
      notBefore: "2026-09-02T02:00:00.000Z",
      expiresAt: "2026-09-02T01:00:00.000Z",
      now: "2026-09-02T00:00:00.000Z",
    })).toThrow("Invalid Kaira activity schedule");
  });

  it("does not create persistent schedules for Welcome Kaira", () => {
    expect(() => createKairaActivitySchedule({
      ownerUserId: "owner_1",
      kairaInstanceId: "welcome_1",
      instanceType: "welcome",
      activityId: "theatre_01",
      notBefore: "2026-09-02T01:00:00.000Z",
      now: "2026-09-02T00:00:00.000Z",
    })).toThrow("cannot own activity schedule");
  });
});
