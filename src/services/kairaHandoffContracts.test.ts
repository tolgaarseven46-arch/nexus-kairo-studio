import { describe, expect, it } from "vitest";
import { resolveKairaInstanceContext } from "./kairaInstanceContext";
import {
  buildWelcomeToIndividualHandoff,
  mayTransferWelcomeCandidate,
} from "./kairaHandoffPolicy";

describe("Welcome to Individual Kaira handoff", () => {
  const welcome = resolveKairaInstanceContext({ instanceId: "welcome_server-1", instanceType: "welcome" });
  const individual = resolveKairaInstanceContext({ instanceId: "kaira_1001", instanceType: "individual" });

  it("transfers operational assignment context but no character memories", () => {
    const handoff = buildWelcomeToIndividualHandoff({
      from: welcome,
      to: individual,
      operationalContext: {
        targetServerId: "server-1",
        ownerUserId: "user-1",
        ownerDisplayName: "Ali",
        onboardingCompletedSteps: ["invite-explained", "channels-explained"],
      },
    });
    expect(handoff.fromInstanceId).toBe("welcome_server-1");
    expect(handoff.toInstanceId).toBe("kaira_1001");
    expect(handoff.transferredCharacterMemories).toEqual([]);
    expect(handoff.operationalContext.targetServerId).toBe("server-1");
  });

  it("rejects relationship, preference, fact, episode and world-event transfer", () => {
    for (const kind of [
      "relationship_state",
      "user_preference",
      "user_fact",
      "conversation_episode",
      "world_event",
    ] as const) {
      expect(mayTransferWelcomeCandidate({ kind, value: {} })).toBe(false);
    }
    expect(mayTransferWelcomeCandidate({ kind: "operational_context", value: {} })).toBe(true);
  });

  it("rejects invalid handoff directions", () => {
    expect(() => buildWelcomeToIndividualHandoff({
      from: individual,
      to: individual,
      operationalContext: { targetServerId: "s", ownerUserId: "u" },
    })).toThrow(/Welcome/);
  });
});
