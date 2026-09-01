import { describe, expect, it } from "vitest";
import { createKairaActivityExecution } from "./kairaActivityExecution";
import { createKairaActivityPermissionDialogueRequest } from "./kairaActivityPermissionDialogue";
import {
  clearKairaActivityPermissionSessionPointer,
  createKairaActivityPermissionSessionPointer,
} from "./kairaActivityPermissionSessionPointer";

const request = () =>
  createKairaActivityPermissionDialogueRequest({
    execution: createKairaActivityExecution({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      activityId: "theatre_01",
      activityType: "theatre",
      permissionPolicy: "owner_approval",
      now: "2026-09-02T10:00:00.000Z",
    }),
    sessionId: "session_1",
    promptTurnId: "turn_42",
    now: "2026-09-02T10:01:00.000Z",
  });

describe("Kaira activity permission session pointer contracts", () => {
  it("projects one pending request into an active session pointer", () => {
    expect(createKairaActivityPermissionSessionPointer(request())).toMatchObject({
      status: "active",
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      sessionId: "session_1",
      request: { activityId: "theatre_01", promptTurnId: "turn_42" },
    });
  });

  it("refuses to reactivate an already settled permission request", () => {
    expect(() =>
      createKairaActivityPermissionSessionPointer({ ...request(), status: "granted" }),
    ).toThrow("Pending Kaira activity permission request required");
  });

  it("clears an active pointer once and keeps terminal cleanup immutable", () => {
    const active = createKairaActivityPermissionSessionPointer(request());
    const cleared = clearKairaActivityPermissionSessionPointer(
      active,
      "2026-09-02T10:02:00.000Z",
    );
    expect(cleared).toMatchObject({
      status: "cleared",
      clearedAt: "2026-09-02T10:02:00.000Z",
    });
    expect(
      clearKairaActivityPermissionSessionPointer(cleared, "2026-09-02T10:03:00.000Z"),
    ).toBe(cleared);
  });
});
