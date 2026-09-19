import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPrivatRoomConversationGraphObservation } from "./privatRoomConversationGraphObservation";

describe("PrivatRoom live graph observation regression", () => {
  it("keeps observation metadata evidence-only while persisting it on both chat paths", () => {
    const graph = buildPrivatRoomConversationGraphObservation({
      event: {
        eventId: "evt-1",
        occurredAt: 2,
        kairaInstanceId: "kaira-main",
        conversation: {
          kind: "room",
          conversationId: "room:r1",
          participantIds: ["u1", "droit_kaira_beta"],
          roomContext: {
            roomId: "r1",
            participants: [
              {
                participantId: "owner-1",
                actorKind: "human",
                platformRoles: ["owner"],
              },
              {
                participantId: "u1",
                actorKind: "human",
                platformRoles: ["member"],
              },
              {
                participantId: "droit_kaira_beta",
                actorKind: "droit",
                platformRoles: ["member"],
              },
            ],
            recentHistory: [
              {
                sender: "droit",
                text: "hoş geldin",
                participantId: "droit_kaira_beta",
                eventId: "welcome-1",
                occurredAt: 1,
                actorKind: "droit",
              },
            ],
          },
        },
        actor: { userId: "u1", displayName: "User" },
        message: { messageId: "m1", text: "selam", createdAt: 2 },
      },
      environmentId: "live-beta",
      testRunId: "TR_live_beta_r1",
    });

    expect(graph.events.map((event) => event.eventId)).toEqual(["welcome-1", "m1"]);
    expect(graph.participants.filter((participant) => participant.actorKind === "human")).toHaveLength(2);
    expect(graph.participants.find((participant) => participant.participantId === "owner-1")).toMatchObject({
      participantId: "owner-1",
      actorKind: "human",
      platformRoles: ["owner"],
      messageCount: 0,
    });
    expect(graph).not.toHaveProperty("answerDecision");
    expect(graph).not.toHaveProperty("responseDecision");

    const serverSource = readFileSync(
      new URL("../../server.ts", import.meta.url),
      "utf8",
    );
    expect(
      (serverSource.match(/conversationGraphObservation:/g) || []).length,
    ).toBeGreaterThanOrEqual(2);

    const ingressSource = readFileSync(
      new URL("./privatRoomDmIntegrationRoute.ts", import.meta.url),
      "utf8",
    );
    expect(ingressSource).toContain("buildPrivatRoomConversationGraphObservation");
    expect(ingressSource).toContain("conversationGraphObservation,");
  });
});
