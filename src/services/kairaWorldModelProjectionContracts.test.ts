import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  projectWorldModel,
  validateWorldModelProjection,
} from "./worldModelProjection";

function observation(input: {
  id: string;
  at: string;
  propositionKey?: string;
  polarity?: "positive" | "negative" | "unknown";
  kairaInstanceId?: string;
  modality?: "fact" | "intention" | "plan" | "commitment" | "possibility" | "desire" | "refusal" | "unknown";
  lifecycle?: "executed" | "cancelled" | "postponed" | "failed" | "unspecified";
}): WorldEventObservation {
  const propositionKey = input.propositionKey || "ali|general|?|istifa";
  return {
    id: input.id,
    userId: "user-1",
    kairaInstanceId: input.kairaInstanceId,
    sessionId: "session-1",
    kind: "reported_claim",
    status: "grounded",
    createdAt: input.at,
    event: {
      raw: input.id,
      eventType: "general",
      reportedSpeech: true,
      certainty: 0.9,
      ambiguities: [],
      evidence: [],
      polarity: input.polarity || "positive",
      temporal: { relation: "unspecified", asksLatest: false },
      proposition: {
        key: propositionKey,
        predicate: "general",
        actorKey: "ali",
        contentKey: "istifa",
      },
      modality: {
        kind: input.modality || "fact",
        strength: 0.9,
      },
      lifecycle: {
        kind: input.lifecycle || "unspecified",
        strength: input.lifecycle && input.lifecycle !== "unspecified" ? 0.9 : 0,
      },
    },
  };
}

describe("canonical world-model projection contracts", () => {
  it("compresses consistent positive evidence into affirmed bounded state", () => {
    const rows = [
      observation({ id: "a", at: "2026-08-30T10:00:00.000Z" }),
      observation({ id: "b", at: "2026-08-30T10:01:00.000Z" }),
    ];
    const [state] = projectWorldModel(rows);
    expect(state.assertionState).toBe("affirmed");
    expect(state.evidenceStatus).toBe("consistent");
    expect(state.latestEvidenceId).toBe("b");
    expect(new Set(state.evidenceObservationIds)).toEqual(new Set(["a", "b"]));
    expect(validateWorldModelProjection(rows)).toEqual([]);
  });

  it("never promotes conflicting evidence to truth just because one row is newer", () => {
    const rows = [
      observation({ id: "yes", at: "2026-08-30T10:00:00.000Z", polarity: "positive" }),
      observation({ id: "no", at: "2026-08-30T10:02:00.000Z", polarity: "negative" }),
    ];
    const [state] = projectWorldModel(rows);
    expect(state.latestEvidenceId).toBe("no");
    expect(state.latestEvidencePolarity).toBe("negative");
    expect(state.evidenceStatus).toBe("conflicting");
    expect(state.assertionState).toBe("conflicting");
    expect(validateWorldModelProjection(rows)).toEqual([]);
  });

  it("keeps the same proposition separate across Kaira instances even with mixed input", () => {
    const rows = [
      observation({ id: "ka", at: "2026-08-30T10:00:00.000Z", kairaInstanceId: "kaira_a", polarity: "positive" }),
      observation({ id: "kb", at: "2026-08-30T10:01:00.000Z", kairaInstanceId: "kaira_b", polarity: "negative" }),
    ];
    const states = projectWorldModel(rows);
    expect(states).toHaveLength(2);
    expect(states.find((x) => x.kairaInstanceId === "kaira_a")?.assertionState).toBe("affirmed");
    expect(states.find((x) => x.kairaInstanceId === "kaira_b")?.assertionState).toBe("denied");
    expect(validateWorldModelProjection(rows, states)).toEqual([]);
  });

  it("projects the current lifecycle of the newest plan generation without losing source evidence", () => {
    const rows = [
      observation({
        id: "plan",
        at: "2026-08-30T10:00:00.000Z",
        modality: "plan",
      }),
      observation({
        id: "done",
        at: "2026-08-30T10:05:00.000Z",
        modality: "fact",
        lifecycle: "executed",
      }),
    ];
    const [state] = projectWorldModel(rows);
    expect(state.lifecycle.state).toBe("executed");
    expect(state.lifecycle.planObservationId).toBe("plan");
    expect(new Set(state.lifecycle.evidenceObservationIds)).toEqual(new Set(["plan", "done"]));
    expect(validateWorldModelProjection(rows)).toEqual([]);
  });
});
