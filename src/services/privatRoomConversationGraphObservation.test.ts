import { describe, expect, it } from "vitest";
import { buildPrivatRoomConversationGraphObservation } from "./privatRoomConversationGraphObservation";

describe("PrivatRoom -> Slice B live observation wiring", () => {
  it("builds observation-only graph from platform history + current room event", () => {
    const graph = buildPrivatRoomConversationGraphObservation({
      event: {
        eventId: "evt-current",
        occurredAt: 300,
        kairaInstanceId: "kaira-main",
        conversation: {
          kind: "room",
          conversationId: "room:room-1",
          participantIds: ["u2", "droit_kaira_beta"],
          roomContext: {
            roomId: "room-1",
            roomName: "Genel",
            actorIsOwner: false,
            participants: [
              {
                participantId: "u1",
                actorKind: "human",
                platformRoles: ["owner"],
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
                text: "selam",
                participantName: "Kaira",
                participantId: "droit_kaira_beta",
                eventId: "m2",
                occurredAt: 200,
                actorKind: "droit",
              },
            ],
          },
        },
        actor: { userId: "u2", displayName: "Ayşe" },
        message: { messageId: "m3", text: "naber", createdAt: 300, replyToMessageId: "m1" },
      },
      environmentId: "live-beta",
      testRunId: "TR_live_beta_room-1",
    });

    expect(graph.namespace).toMatchObject({
      environmentId: "live-beta",
      testRunId: "TR_live_beta_room-1",
      serverId: "room-1",
      roomId: "room-1",
      kairaInstanceId: "kaira-main",
    });
    expect(graph.events.map((event) => event.eventId)).toEqual(["m2", "m3"]);
    expect(graph.participants.map((participant) => participant.participantId)).toEqual([
      "droit_kaira_beta",
      "u1",
      "u2",
    ]);
    expect(graph.explicitReplyEdges).toEqual([
      { fromEventId: "m3", toEventId: "m1", source: "platform" },
    ]);
    expect(graph).not.toHaveProperty("answerDecision");
    expect(graph).not.toHaveProperty("responseDecision");
  });

  it("does not invent platform history identities when metadata is absent", () => {
    const graph = buildPrivatRoomConversationGraphObservation({
      event: {
        eventId: "evt-current",
        occurredAt: 300,
        kairaInstanceId: "kaira-main",
        conversation: {
          kind: "room",
          conversationId: "room:room-1",
          participantIds: ["u2", "droit_kaira_beta"],
          roomContext: {
            roomId: "room-1",
            recentHistory: [
              { sender: "user", text: "legacy history", participantName: "Biri" },
            ],
          },
        },
        actor: { userId: "u2", displayName: "Ayşe" },
        message: { messageId: "m3", text: "naber", createdAt: 300 },
      },
      environmentId: "live-beta",
      testRunId: "TR_live_beta_room-1",
    });

    expect(graph.events.map((event) => event.eventId)).toEqual(["m3"]);
    expect(graph.participants.map((participant) => participant.participantId)).toEqual(["u2"]);
  });
});
