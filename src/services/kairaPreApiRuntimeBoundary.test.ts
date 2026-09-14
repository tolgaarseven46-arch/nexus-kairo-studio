import { afterEach, describe, expect, it, vi } from "vitest";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import { projectSemanticEvent } from "./semanticInterpretationProjection";

vi.mock("./testSessionLayerAuditService", () => ({
  saveTestSessionLayerAudit: vi.fn(async () => undefined),
}));

vi.mock("../lib/firebase", () => ({
  auth: { currentUser: null },
}));

import { droitChatService } from "./droitChatService";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("real client pre-provider runtime boundary", () => {
  it("carries one assembled episode through canonical LU and the real client behavior pipeline into /api/chat payload", async () => {
    const episodeText = "dün bir kız gördüm\notobüs durağında\nkonuşamadım ya";
    const interpretation = interpretationFromRegexFloor(episodeText);
    const event = projectSemanticEvent(interpretation);
    const requests: Array<{ url: string; body: any }> = [];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      requests.push({ url, body });

      if (url === "/api/language-understanding") {
        return new Response(JSON.stringify({
          interpretation,
          event,
          semanticSource: "runtime_boundary_test",
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url === "/api/chat") {
        return new Response(JSON.stringify({
          reply: "ignored-provider-output",
          sessionId: "runtime-boundary-session",
          turnId: "runtime-boundary-turn",
          kdm: {
            behaviorProfile: {},
            semanticInterpretation: body.semanticInterpretation,
            semanticEvent: body.semanticEvent,
          },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await droitChatService.sendMessage({
      userMessage: "konuşamadım ya",
      textEpisode: {
        fragments: [
          { text: "dün bir kız gördüm" },
          { text: "otobüs durağında" },
          { text: "konuşamadım ya" },
        ],
      },
      messageContext: {
        replyTo: { messageId: "msg-anchor-1", authorId: "friend-1" },
        mentions: [{ entityId: "friend-1" }],
      },
      personality: {} as any,
      userId: "runtime-user",
      userName: "Tolga",
      sessionId: "runtime-boundary-session",
      kairaInstanceId: "runtime-kaira",
      provider: "openrouter",
    });

    const luRequest = requests.find((request) => request.url === "/api/language-understanding");
    const chatRequest = requests.find((request) => request.url === "/api/chat");

    expect(luRequest).toBeTruthy();
    expect(luRequest?.body.userMessage).toBe(episodeText);
    expect(luRequest?.body.interactionContext).toEqual({
      replyTo: { messageId: "msg-anchor-1", authorId: "friend-1" },
      mentions: [{ entityId: "friend-1" }],
    });

    expect(chatRequest).toBeTruthy();
    expect(chatRequest?.body.userMessage).toBe(episodeText);
    expect(chatRequest?.body.userId).toBe("runtime-user");
    expect(chatRequest?.body.sessionId).toBe("runtime-boundary-session");
    expect(chatRequest?.body.semanticInterpretation).toEqual(interpretation);
    expect(chatRequest?.body.semanticEvent).toEqual(event);
    expect(chatRequest?.body.behaviorPolicy).toBeTruthy();
    expect(chatRequest?.body.responsePersonality).toBeTruthy();
    expect(chatRequest?.body.kairaInstanceId).toBe("runtime-kaira");
    expect(requests.map((request) => request.url)).toEqual([
      "/api/language-understanding",
      "/api/chat",
    ]);
  }, 60_000);
});
