import { describe, expect, it } from "vitest";
import { createKairaActivityExecution } from "./kairaActivityExecution";
import {
  classifyKairaActivityPermissionReply,
  createKairaActivityPermissionDialogueRequest,
  resolveKairaActivityPermissionReply,
  settleKairaActivityPermissionDialogueRequest,
} from "./kairaActivityPermissionDialogue";

const execution = () =>
  createKairaActivityExecution({
    ownerUserId: "owner_1",
    kairaInstanceId: "kaira_a",
    instanceType: "individual",
    activityId: "theatre_01",
    activityType: "theatre",
    permissionPolicy: "owner_approval",
    now: "2026-09-02T10:00:00.000Z",
  });

const request = () =>
  createKairaActivityPermissionDialogueRequest({
    execution: execution(),
    sessionId: "chat_session_1",
    promptTurnId: "assistant_turn_42",
    now: "2026-09-02T10:01:00.000Z",
    expiresAt: "2026-09-02T11:01:00.000Z",
  });

describe("Kaira activity permission dialogue contracts", () => {
  it("creates permission dialogue only for a pending owner-approved activity", () => {
    expect(request()).toMatchObject({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      sessionId: "chat_session_1",
      promptTurnId: "assistant_turn_42",
      status: "pending",
    });
    expect(() =>
      createKairaActivityPermissionDialogueRequest({
        execution: createKairaActivityExecution({
          ownerUserId: "owner_1",
          kairaInstanceId: "kaira_a",
          instanceType: "individual",
          activityId: "walk_01",
          activityType: "walk",
          permissionPolicy: "none",
          now: "2026-09-02T10:00:00.000Z",
        }),
        sessionId: "chat_session_1",
        promptTurnId: "assistant_turn_42",
        now: "2026-09-02T10:01:00.000Z",
      }),
    ).toThrow("Pending owner-approved");
  });

  it("recognizes only bounded short permission answers", () => {
    expect(classifyKairaActivityPermissionReply("evet")).toBe("grant");
    expect(classifyKairaActivityPermissionReply("tamamdır")).toBe("grant");
    expect(classifyKairaActivityPermissionReply("hayır")).toBe("deny");
    expect(classifyKairaActivityPermissionReply("bugün gitme")).toBe("deny");
    expect(classifyKairaActivityPermissionReply("evet ama önce Mert ne yapacaktı?"))
      .toBe("unmatched");
    expect(classifyKairaActivityPermissionReply("tamam kanka yarın konuşuruz"))
      .toBe("unmatched");
  });

  it("binds a generic yes only to the immediately correlated permission prompt", () => {
    const result = resolveKairaActivityPermissionReply({
      request: request(),
      replyingUserId: "owner_1",
      sessionId: "chat_session_1",
      previousAssistantTurnId: "assistant_turn_42",
      message: "evet",
      now: "2026-09-02T10:02:00.000Z",
    });
    expect(result).toMatchObject({
      status: "matched",
      intent: "grant",
      command: {
        type: "grant_permission",
        authority: "activity_permission_controller",
        decidedByUserId: "owner_1",
      },
    });
  });

  it("does not let a later generic yes approve a stale activity request", () => {
    const result = resolveKairaActivityPermissionReply({
      request: request(),
      replyingUserId: "owner_1",
      sessionId: "chat_session_1",
      previousAssistantTurnId: "assistant_turn_99",
      message: "evet",
      now: "2026-09-02T10:05:00.000Z",
    });
    expect(result).toMatchObject({
      status: "unmatched",
      reason: "prompt_correlation_mismatch",
    });
  });

  it("does not allow another user or another session to decide the permission", () => {
    expect(
      resolveKairaActivityPermissionReply({
        request: request(),
        replyingUserId: "owner_2",
        sessionId: "chat_session_1",
        previousAssistantTurnId: "assistant_turn_42",
        message: "evet",
        now: "2026-09-02T10:02:00.000Z",
      }),
    ).toMatchObject({ status: "unmatched", reason: "owner_mismatch" });

    expect(
      resolveKairaActivityPermissionReply({
        request: request(),
        replyingUserId: "owner_1",
        sessionId: "chat_session_2",
        previousAssistantTurnId: "assistant_turn_42",
        message: "hayır",
        now: "2026-09-02T10:02:00.000Z",
      }),
    ).toMatchObject({ status: "unmatched", reason: "session_mismatch" });
  });

  it("rejects expired permission replies and keeps terminal request settlement immutable", () => {
    expect(
      resolveKairaActivityPermissionReply({
        request: request(),
        replyingUserId: "owner_1",
        sessionId: "chat_session_1",
        previousAssistantTurnId: "assistant_turn_42",
        message: "evet",
        now: "2026-09-02T11:02:00.000Z",
      }),
    ).toMatchObject({ status: "unmatched", reason: "request_expired" });

    const granted = settleKairaActivityPermissionDialogueRequest(
      request(),
      "grant",
      "2026-09-02T10:03:00.000Z",
    );
    expect(granted.status).toBe("granted");
    expect(
      settleKairaActivityPermissionDialogueRequest(
        granted,
        "deny",
        "2026-09-02T10:04:00.000Z",
      ),
    ).toBe(granted);
  });
});
