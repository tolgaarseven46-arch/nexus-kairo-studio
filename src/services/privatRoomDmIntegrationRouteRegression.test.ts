import { afterEach, describe, expect, it, vi } from "vitest";
import type { Express, Request, Response } from "express";
import { registerPrivatRoomDmIntegrationRoute } from "./privatRoomDmIntegrationRoute";

describe("PrivatRoom DM integration regression", () => {
  const originalToken = process.env.PRIVATROOM_INTEGRATION_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) delete process.env.PRIVATROOM_INTEGRATION_TOKEN;
    else process.env.PRIVATROOM_INTEGRATION_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("registers the versioned PrivatRoom DM ingress at the composition boundary", () => {
    const post = vi.fn();
    registerPrivatRoomDmIntegrationRoute({ post } as unknown as Express);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0]?.[0]).toBe("/api/integrations/privatroom/dm");
    expect(typeof post.mock.calls[0]?.[1]).toBe("function");
  });

  it("returns a typed no-reply without calling Kaira core when message.send is not granted", async () => {
    process.env.PRIVATROOM_INTEGRATION_TOKEN = "privatroom-test-token";

    let handler: ((req: Request, res: Response) => Promise<unknown>) | undefined;
    const app = {
      post: (_path: string, candidate: typeof handler) => {
        handler = candidate;
      },
    } as unknown as Express;
    registerPrivatRoomDmIntegrationRoute(app);

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const json = vi.fn();
    const status = vi.fn(() => ({ json })) as unknown as Response["status"];
    const req = {
      get: (name: string) => name.toLowerCase() === "authorization" ? "Bearer privatroom-test-token" : undefined,
      body: {
        contractVersion: 1,
        source: "privatroom",
        eventType: "message.created",
        eventId: "evt-1",
        occurredAt: 1,
        kairaInstanceId: "kaira-1",
        conversation: {
          kind: "direct",
          conversationId: "dm-1",
          participantIds: ["user-1", "kaira-1"],
        },
        actor: {
          userId: "user-1",
          displayName: "Tolga",
        },
        message: {
          messageId: "msg-1",
          text: "selam",
          createdAt: 1,
        },
        capabilities: [],
      },
    } as unknown as Request;
    const res = { status, json } as unknown as Response;

    expect(handler).toBeDefined();
    await handler!(req, res);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({
      contractVersion: 1,
      sourceEventId: "evt-1",
      responseId: "no_reply_evt-1",
      proposedActions: [],
      noReplyReason: "message_send_capability_not_granted",
    });
  });
});
