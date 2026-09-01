import { beforeEach, describe, expect, it, vi } from "vitest";
import { createKairaActivityExecution } from "./kairaActivityExecution";
import { createKairaActivityPermissionDialogueRequest } from "./kairaActivityPermissionDialogue";

const mocks = vi.hoisted(() => ({
  applyExecution: vi.fn(),
  createRequest: vi.fn(),
  settleRequest: vi.fn(),
}));

vi.mock("./kairaActivityExecutionCoordinator", () => ({
  applyKairaActivityExecutionCommand: mocks.applyExecution,
}));
vi.mock("./kairaActivityPermissionDialogueStore", () => ({
  createKairaActivityPermissionRequestAtomic: mocks.createRequest,
  settleKairaActivityPermissionRequestAtomic: mocks.settleRequest,
}));

import {
  applyKairaActivityPermissionDialogueReply,
  openKairaActivityPermissionDialogue,
} from "./kairaActivityPermissionDialogueCoordinator";

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
    sessionId: "session_1",
    promptTurnId: "assistant_42",
    now: "2026-09-02T10:01:00.000Z",
  });

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity permission dialogue coordinator contracts", () => {
  it("persists the exact correlated request opened from execution state", async () => {
    mocks.createRequest.mockImplementation(async (value) => ({ status: "created", request: value }));
    const result = await openKairaActivityPermissionDialogue({
      execution: execution(),
      sessionId: "session_1",
      promptTurnId: "assistant_42",
      now: "2026-09-02T10:01:00.000Z",
    });
    expect(result.status).toBe("created");
    expect(mocks.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        activityId: "theatre_01",
        sessionId: "session_1",
        promptTurnId: "assistant_42",
        status: "pending",
      }),
    );
  });

  it("does not touch executor or persistence for an uncorrelated generic yes", async () => {
    const result = await applyKairaActivityPermissionDialogueReply({
      request: request(),
      replyingUserId: "owner_1",
      sessionId: "session_1",
      previousAssistantTurnId: "assistant_99",
      message: "evet",
      now: "2026-09-02T10:02:00.000Z",
    });
    expect(result.status).toBe("unmatched");
    expect(mocks.applyExecution).not.toHaveBeenCalled();
    expect(mocks.settleRequest).not.toHaveBeenCalled();
  });

  it("applies canonical execution permission before settling dialogue request", async () => {
    const pending = request();
    mocks.applyExecution.mockResolvedValue({
      execution: {
        status: "applied",
        record: { ...execution(), permissionStatus: "granted" },
      },
    });
    mocks.settleRequest.mockImplementation(async ({ request: value, now }) => ({
      ...value,
      status: "granted",
      resolvedAt: now,
    }));

    const result = await applyKairaActivityPermissionDialogueReply({
      request: pending,
      replyingUserId: "owner_1",
      sessionId: "session_1",
      previousAssistantTurnId: "assistant_42",
      message: "evet",
      now: "2026-09-02T10:02:00.000Z",
    });

    expect(result.status).toBe("applied");
    expect(mocks.applyExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        activityId: "theatre_01",
        command: {
          type: "grant_permission",
          authority: "activity_permission_controller",
          decidedByUserId: "owner_1",
        },
      }),
    );
    expect(mocks.applyExecution.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.settleRequest.mock.invocationCallOrder[0]);
  });

  it("keeps the dialogue request pending when canonical execution rejects", async () => {
    mocks.applyExecution.mockResolvedValue({
      execution: {
        status: "rejected",
        record: execution(),
        reason: "permission_already_decided",
      },
    });
    const result = await applyKairaActivityPermissionDialogueReply({
      request: request(),
      replyingUserId: "owner_1",
      sessionId: "session_1",
      previousAssistantTurnId: "assistant_42",
      message: "hayır",
      now: "2026-09-02T10:02:00.000Z",
    });
    expect(result.status).toBe("execution_rejected");
    expect(mocks.settleRequest).not.toHaveBeenCalled();
  });

  it("can finish request settlement after an exact executor replay", async () => {
    mocks.applyExecution.mockResolvedValue({
      execution: {
        status: "replayed",
        record: { ...execution(), permissionStatus: "granted" },
      },
    });
    mocks.settleRequest.mockImplementation(async ({ request: value, now }) => ({
      ...value,
      status: "granted",
      resolvedAt: now,
    }));
    const result = await applyKairaActivityPermissionDialogueReply({
      request: request(),
      replyingUserId: "owner_1",
      sessionId: "session_1",
      previousAssistantTurnId: "assistant_42",
      message: "evet",
      now: "2026-09-02T10:03:00.000Z",
    });
    expect(result).toMatchObject({ status: "applied", request: { status: "granted" } });
  });
});
