import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  detectWorldEventLifecycleSignal,
  resolvePlanLifecycle,
} from "./worldEventLifecycle";

function observation(input: {
  id: string;
  createdAt: string;
  modality?: "commitment" | "plan" | "intention" | "refusal" | "unspecified";
  lifecycle?: "executed" | "cancelled" | "postponed" | "failed" | "unspecified";
  polarity?: "positive" | "negative";
}): WorldEventObservation {
  return {
    id: input.id,
    userId: "user-1",
    sessionId: "session-1",
    kind: "reported_claim",
    status: "grounded",
    createdAt: input.createdAt,
    event: {
      raw: input.id,
      eventType: "general",
      actor: { name: "Mert", source: "explicit_name", confidence: 1 },
      reportedSpeech: true,
      certainty: 0.95,
      ambiguities: [],
      evidence: [],
      proposition: {
        key: "mert|general|?|resign",
        predicate: "general",
        actorKey: "mert",
        contentKey: "resign",
      },
      polarity: input.polarity || "positive",
      temporal: { relation: "unspecified", asksLatest: false },
      modality: {
        kind: input.modality || "unspecified",
        strength: input.modality === "commitment" ? 0.9 : 0.5,
      },
      lifecycle: {
        kind: input.lifecycle || "unspecified",
        strength: input.lifecycle && input.lifecycle !== "unspecified" ? 0.9 : 0,
      },
    },
  };
}

describe("Kaira plan lifecycle contracts", () => {
  it("detects bounded execution outcomes without rewriting modality", () => {
    expect(detectWorldEventLifecycleSignal("Mert bugün istifa etti").kind).toBe("executed");
    expect(detectWorldEventLifecycleSignal("Mert istifadan vazgeçti").kind).toBe("cancelled");
    expect(detectWorldEventLifecycleSignal("Mert istifayı erteledi").kind).toBe("postponed");
    expect(detectWorldEventLifecycleSignal("Mert istifa edemedi, olmadı").kind).toBe("failed");
    expect(detectWorldEventLifecycleSignal("Mert yarın istifa edecek").kind).toBe("unspecified");
  });

  it("derives executed state while preserving the original plan evidence", () => {
    const plan = observation({ id: "plan", createdAt: "2026-08-20T10:00:00.000Z", modality: "commitment" });
    const done = observation({ id: "done", createdAt: "2026-08-21T10:00:00.000Z", lifecycle: "executed" });

    const result = resolvePlanLifecycle([plan, done], "mert|general|?|resign");
    expect(result.state).toBe("executed");
    expect(result.planObservationId).toBe("plan");
    expect(result.evidenceObservationIds).toEqual(expect.arrayContaining(["plan", "done"]));
  });

  it("distinguishes cancellation postponement and failure", () => {
    const plan = observation({ id: "plan", createdAt: "2026-08-20T10:00:00.000Z", modality: "plan" });
    for (const state of ["cancelled", "postponed", "failed"] as const) {
      const outcome = observation({ id: state, createdAt: "2026-08-21T10:00:00.000Z", lifecycle: state });
      expect(resolvePlanLifecycle([plan, outcome], "mert|general|?|resign").state).toBe(state);
    }
  });

  it("uses the newest lifecycle signal instead of an older outcome", () => {
    const plan = observation({ id: "plan", createdAt: "2026-08-20T10:00:00.000Z", modality: "commitment" });
    const postponed = observation({ id: "postponed", createdAt: "2026-08-21T10:00:00.000Z", lifecycle: "postponed" });
    const executed = observation({ id: "executed", createdAt: "2026-08-22T10:00:00.000Z", lifecycle: "executed" });

    expect(resolvePlanLifecycle([plan, postponed, executed], "mert|general|?|resign").state).toBe("executed");
  });

  it("does not treat refusal or negative evidence as an active plan", () => {
    const refusal = observation({
      id: "refusal",
      createdAt: "2026-08-20T10:00:00.000Z",
      modality: "refusal",
      polarity: "negative",
    });
    expect(resolvePlanLifecycle([refusal], "mert|general|?|resign").state).toBe("unknown");
  });
});
