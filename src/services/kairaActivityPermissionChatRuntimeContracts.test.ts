import { beforeEach, describe, expect, it, vi } from "vitest";
import { createKairaActivityExecution } from "./kairaActivityExecution";
import { createKairaActivityPermissionDialogueRequest } from "./kairaActivityPermissionDialogue";
import { createKairaActivityPermissionSessionPointer } from "./kairaActivityPermissionSessionPointer";

const mocks = vi.hoisted(() => ({
  listExecutions: vi.fn(),
  loadPointer: vi.fn(),
  openDialogue: vi.fn(),
  applyReply: vi.fn(),
}));

vi.mock("./kairaActivityExecutionStore", () => ({
  listOpenKairaActivityExecutions: mocks.listExecutions,
}));
vi.mock("./kairaActivityPermissionSessionPointerStore", () => ({
  loadActiveKairaActivityPermissionSessionPointer: mocks.loadPointer,
}));
vi.mock("./kairaActivityPermissionDialogueCoordinator", () => ({
  openKairaActivityPermissionDialogue: mocks.openDialogue,
  applyKairaActivityPermissionDialogueReply: mocks.applyReply,
}));

import {
  composeKairaActivityPermissionChatReply,
  presentKairaActivityPermissionChatPrompt,
  resolveKairaActivityPermissionChatReply,
} from "./kairaActivityPermissionChatRuntime";

const execution = (activityId = "museum_01", createdAt = "2026-09-02T10:00:00.000Z") =>
  createKairaActivityExecution({
    ownerUserId: "owner_1",
    kairaInstanceId: "kaira_a",
    instanceType: "individual",
    activityId,
    activityType: "museum_visit",
    permissionPolicy: "owner_approval",
    now: createdAt,
  });

const pointer = () => {
  const request = createKairaActivityPermissionDialogueRequest({
    execution: execution(),
    sessionId: "session_1",
    promptTurnId: "permission_prompt_req_1",
    now: "2026-09-02T10:01:00.000Z",
  });
  return createKairaActivityPermissionSessionPointer(request);
};

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity permission chat runtime contracts", () => {
  it("never treats a generic yes as consent without the exact persisted request correlation", async () => {
    mocks.loadPointer.mockResolvedValue(pointer());
    const result = await resolveKairaActivityPermissionChatReply({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      sessionId: "session_1",
      message: "evet",
      now: "2026-09-02T10:02:00.000Z",
    });
    expect(result.status).toBe("uncorrelated");
    expect(mocks.applyReply).not.toHaveBeenCalled();
  });

  it("routes an exactly correlated bounded answer through the canonical dialogue coordinator", async () => {
    const active = pointer();
    mocks.loadPointer.mockResolvedValue(active);
    mocks.applyReply.mockResolvedValue({ status: "applied", decision: { intent: "grant" } });
    const result = await resolveKairaActivityPermissionChatReply({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      sessionId: "session_1",
      permissionRequestId: active.request.requestId,
      message: "evet",
      now: "2026-09-02T10:02:00.000Z",
    });
    expect(result.status).toBe("applied");
    expect(mocks.applyReply).toHaveBeenCalledWith(expect.objectContaining({
      request: active.request,
      replyingUserId: "owner_1",
      previousAssistantTurnId: active.request.promptTurnId,
      message: "evet",
    }));
  });

  it("presents the oldest pending owner-approved execution and persists its dialogue", async () => {
    mocks.loadPointer.mockResolvedValue(null);
    mocks.listExecutions.mockResolvedValue([
      execution("newer", "2026-09-02T10:01:00.000Z"),
      execution("older", "2026-09-02T09:00:00.000Z"),
    ]);
    const openedRequest = createKairaActivityPermissionDialogueRequest({
      execution: execution("older", "2026-09-02T09:00:00.000Z"),
      sessionId: "session_1",
      promptTurnId: "permission_prompt_req_1",
      now: "2026-09-02T10:02:00.000Z",
    });
    mocks.openDialogue.mockResolvedValue({ request: { status: "created", request: openedRequest } });

    const prompt = await presentKairaActivityPermissionChatPrompt({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      sessionId: "session_1",
      promptTurnId: "permission_prompt_req_1",
      now: "2026-09-02T10:02:00.000Z",
    });
    expect(mocks.openDialogue).toHaveBeenCalledWith(expect.objectContaining({
      execution: expect.objectContaining({ activityId: "older" }),
    }));
    expect(prompt).toMatchObject({ activityId: "older", activityLabel: "museum visit" });
  });

  it("re-presents a durable active pointer after reload without selecting another activity", async () => {
    const active = pointer();
    mocks.loadPointer.mockResolvedValue(active);
    const prompt = await presentKairaActivityPermissionChatPrompt({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      sessionId: "session_1",
      promptTurnId: "new_turn",
      now: "2026-09-02T10:03:00.000Z",
    });
    expect(prompt?.requestId).toBe(active.request.requestId);
    expect(mocks.listExecutions).not.toHaveBeenCalled();
    expect(mocks.openDialogue).not.toHaveBeenCalled();
  });

  it("keeps the permission acknowledgement and next prompt explicit in the user-facing reply", () => {
    const reply = composeKairaActivityPermissionChatReply({
      reply: "Bugün biraz meraklı hissediyorum.",
      resolution: { status: "applied", result: { status: "applied", decision: { intent: "deny" } } as any },
      prompt: { requestId: "r2", activityId: "park", activityLabel: "park", text: "Park için izin verir misin?" },
    });
    expect(reply).toContain("yapmayacağım");
    expect(reply).toContain("Bugün biraz meraklı hissediyorum.");
    expect(reply).toContain("Park için izin verir misin?");
  });
});
