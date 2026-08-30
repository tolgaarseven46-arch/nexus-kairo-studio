import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  selectOwnedObservations,
  validateWorldModelOwnership,
} from "./worldModelOwnershipPolicy";

const observation = (
  userId: string,
  sessionId: string,
  raw: string,
  actor = "Ayşe",
): WorldEventObservation => ({
  userId,
  sessionId,
  speakerName: userId,
  kind: "reported_claim",
  status: "grounded",
  createdAt: "2026-08-30T04:00:00.000Z",
  event: {
    raw,
    eventType: "general",
    actor: { name: actor, source: "explicit_name", confidence: 0.95 },
    target: { id: "current_user", name: userId, source: "first_person", confidence: 1 },
    reportedSpeech: true,
    certainty: 0.95,
    ambiguities: [],
    evidence: [`actor:${actor}`],
  },
});

describe("Kaira world-model ownership contracts", () => {
  it("never leaks another owner's evidence into an owner-scoped set", () => {
    const rows = [
      observation("user-a", "s1", "Ayşe bana selam dedi"),
      observation("user-b", "s2", "Merve bana salak dedi", "Merve"),
      observation("user-a", "s3", "Selin bana özür diledi", "Selin"),
    ];

    const owned = selectOwnedObservations(rows, { ownerUserId: "user-a" });
    expect(owned).toHaveLength(2);
    expect(owned.every((item) => item.userId === "user-a")).toBe(true);
  });

  it("can additionally isolate one session without changing account ownership", () => {
    const rows = [
      observation("user-a", "s1", "Ayşe bana selam dedi"),
      observation("user-a", "s2", "Merve bana salak dedi", "Merve"),
    ];

    const selected = selectOwnedObservations(rows, {
      ownerUserId: "user-a",
      sessionId: "s2",
    });
    expect(selected).toHaveLength(1);
    expect(selected[0]?.sessionId).toBe("s2");
  });

  it("does not let event participant names redefine memory ownership", () => {
    const row = observation("user-a", "s1", "user-b bana salak dedi", "user-b");
    const selected = selectOwnedObservations([row], { ownerUserId: "user-a" });
    expect(selected).toHaveLength(1);
    expect(selected[0]?.userId).toBe("user-a");
    expect(selected[0]?.event.actor?.name).toBe("user-b");
  });

  it("requires owner and session metadata on persisted observations", () => {
    const invalid = observation("", "", "Ayşe bana selam dedi");
    const issues = validateWorldModelOwnership([invalid], { ownerUserId: "user-a" });
    const invariants = new Set(issues.map((item) => item.invariant));
    expect(invariants.has("ownership.observation_owner_required")).toBe(true);
    expect(invariants.has("ownership.session_required")).toBe(true);
  });

  it("keeps cross-user isolation stable across generated mixed histories", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const rows: WorldEventObservation[] = [];
      for (let index = 0; index < 40; index += 1) {
        const owner = (index + seed) % 3 === 0 ? "user-a" : (index + seed) % 3 === 1 ? "user-b" : "user-c";
        rows.push(observation(owner, `s-${index % 5}`, `${owner} event ${index}`, `Person-${index % 7}`));
      }
      const selected = selectOwnedObservations(rows, { ownerUserId: "user-b" });
      expect(selected.every((item) => item.userId === "user-b"), `seed=${seed}`).toBe(true);
      expect(validateWorldModelOwnership(rows, { ownerUserId: "user-b" }), `seed=${seed}`).toEqual([]);
    }
  });
});
