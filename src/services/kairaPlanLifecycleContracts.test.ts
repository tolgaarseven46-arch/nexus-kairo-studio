import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  detectWorldEventLifecycleSignal,
  resolvePlanLifecycle,
} from "./worldEventLifecycle";
import { resolvePlanOutcomeRecall } from "./worldEventOutcomeRecallPolicy";
import { coordinateWorldEventRetrieval } from "./worldEventRetrievalCoordinator";

const recallSemantics = {
  discourseFacets: { discourseAct: "recall_request" },
} as Parameters<typeof coordinateWorldEventRetrieval>[0]["interpretation"];

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
    expect(result.generationObservationId).toBe("plan");
    expect(result.evidenceObservationIds).toEqual(expect.arrayContaining(["plan", "done"]));
  });

  it("distinguishes cancellation postponement and failure", () => {
    const plan = observation({ id: "plan", createdAt: "2026-08-20T10:00:00.000Z", modality: "plan" });
    for (const state of ["cancelled", "postponed", "failed"] as const) {
      const outcome = observation({ id: state, createdAt: "2026-08-21T10:00:00.000Z", lifecycle: state });
      expect(resolvePlanLifecycle([plan, outcome], "mert|general|?|resign").state).toBe(state);
    }
  });

  it("uses the newest lifecycle signal inside the current generation", () => {
    const plan = observation({ id: "plan", createdAt: "2026-08-20T10:00:00.000Z", modality: "commitment" });
    const postponed = observation({ id: "postponed", createdAt: "2026-08-21T10:00:00.000Z", lifecycle: "postponed" });
    const executed = observation({ id: "executed", createdAt: "2026-08-22T10:00:00.000Z", lifecycle: "executed" });

    expect(resolvePlanLifecycle([plan, postponed, executed], "mert|general|?|resign").state).toBe("executed");
  });

  it("starts a fresh generation when a newer plan follows cancellation", () => {
    const firstPlan = observation({ id: "plan-1", createdAt: "2026-08-20T10:00:00.000Z", modality: "commitment" });
    const cancelled = observation({ id: "cancelled-1", createdAt: "2026-08-21T10:00:00.000Z", lifecycle: "cancelled" });
    const secondPlan = observation({ id: "plan-2", createdAt: "2026-08-22T10:00:00.000Z", modality: "plan" });

    const result = resolvePlanLifecycle([firstPlan, cancelled, secondPlan], "mert|general|?|resign");
    expect(result.state).toBe("planned");
    expect(result.planObservationId).toBe("plan-2");
    expect(result.generationObservationId).toBe("plan-2");
    expect(result.evidenceObservationIds).toEqual(["plan-2"]);
  });

  it("allows a new generation to close independently of older outcomes", () => {
    const firstPlan = observation({ id: "plan-1", createdAt: "2026-08-20T10:00:00.000Z", modality: "commitment" });
    const postponed = observation({ id: "postponed-1", createdAt: "2026-08-21T10:00:00.000Z", lifecycle: "postponed" });
    const secondPlan = observation({ id: "plan-2", createdAt: "2026-08-22T10:00:00.000Z", modality: "commitment" });
    const executed = observation({ id: "executed-2", createdAt: "2026-08-23T10:00:00.000Z", lifecycle: "executed" });

    const result = resolvePlanLifecycle([firstPlan, postponed, secondPlan, executed], "mert|general|?|resign");
    expect(result.state).toBe("executed");
    expect(result.planObservationId).toBe("plan-2");
    expect(result.evidenceObservationIds).toEqual(["executed-2", "plan-2"]);
    expect(result.evidenceObservationIds).not.toContain("postponed-1");
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

  it("resolves a bounded outcome query to one proposition without lexical guessing", () => {
    const plan = observation({ id: "plan", createdAt: "2026-08-20T10:00:00.000Z", modality: "commitment" });
    const done = observation({ id: "done", createdAt: "2026-08-21T10:00:00.000Z", lifecycle: "executed" });
    const recall = resolvePlanOutcomeRecall({ message: "Mert istifa etti mi?", observations: [done, plan] });

    expect(recall.matched).toBe(true);
    expect(recall.propositionKey).toBe("mert|general|?|resign");
    expect(recall.resolution?.state).toBe("executed");
  });

  it("outcome recall reports the newest plan generation instead of stale cancellation", () => {
    const firstPlan = observation({ id: "plan-1", createdAt: "2026-08-20T10:00:00.000Z", modality: "commitment" });
    const cancelled = observation({ id: "cancelled-1", createdAt: "2026-08-21T10:00:00.000Z", lifecycle: "cancelled" });
    const secondPlan = observation({ id: "plan-2", createdAt: "2026-08-22T10:00:00.000Z", modality: "commitment" });
    const recall = resolvePlanOutcomeRecall({
      message: "Mert'in istifa planına ne oldu?",
      observations: [secondPlan, cancelled, firstPlan],
    });

    expect(recall.matched).toBe(true);
    expect(recall.resolution?.state).toBe("planned");
    expect(recall.resolution?.generationObservationId).toBe("plan-2");
  });

  it("routes outcome recall through lifecycle mode and exposes only current generation evidence", () => {
    const firstPlan = observation({ id: "plan-1", createdAt: "2026-08-20T10:00:00.000Z", modality: "commitment" });
    const cancelled = observation({ id: "cancelled-1", createdAt: "2026-08-21T10:00:00.000Z", lifecycle: "cancelled" });
    const secondPlan = observation({ id: "plan-2", createdAt: "2026-08-22T10:00:00.000Z", modality: "commitment" });
    const executed = observation({ id: "executed-2", createdAt: "2026-08-23T10:00:00.000Z", lifecycle: "executed" });
    const result = coordinateWorldEventRetrieval({
      message: "Mert istifa etti mi?",
      interpretation: recallSemantics,
      sessionId: "session-1",
      observations: [executed, secondPlan, cancelled, firstPlan],
    });

    expect(result.mode).toBe("plan_outcome");
    expect(result.planLifecycleResolution?.state).toBe("executed");
    expect(result.planLifecycleResolution?.generationObservationId).toBe("plan-2");
    expect(result.items.map((item) => item.observation.id)).toEqual(["executed-2", "plan-2"]);
    expect(result.items.every((item) => item.reasons.includes("plan_lifecycle_evidence"))).toBe(true);
  });
});