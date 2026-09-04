import { describe, expect, it } from "vitest";
import { buildKairaActivityPermissionChatPrompt } from "./kairaActivityPermissionChatRuntime";

describe("Kaira activity permission chat presentation", () => {
  it("never prettifies an internal activity key or activityId into user-facing copy", () => {
    const prompt = buildKairaActivityPermissionChatPrompt({
      requestId: "permission_request_1",
      activityId: "planning_dynamic_state_chat_request_kaira_123",
      activityType: "planning_dynamic_state_chat_request_kaira",
    });

    expect(prompt.activityLabel).toBe("planladığım aktivite");
    expect(prompt.text).not.toContain("planning");
    expect(prompt.text).not.toContain("dynamic state");
    expect(prompt.text).not.toContain("kaira 123");
  });

  it("keeps a simple presentation-safe activity type when one exists", () => {
    const prompt = buildKairaActivityPermissionChatPrompt({
      requestId: "permission_request_2",
      activityId: "activity_2",
      activityType: "tiyatro",
    });

    expect(prompt.activityLabel).toBe("tiyatro");
    expect(prompt.text).toContain("tiyatro aktivitesini");
  });

  it("uses generic copy when only an internal activityId exists", () => {
    const prompt = buildKairaActivityPermissionChatPrompt({
      requestId: "permission_request_3",
      activityId: "activity_internal_987",
    });

    expect(prompt.activityLabel).toBe("planladığım aktivite");
    expect(prompt.text).not.toContain("activity internal 987");
  });
});
