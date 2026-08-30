import { describe, expect, it } from "vitest";
import type { WorldEventObservation } from "./worldModelEventStore";
import {
  detectWorldEventModality,
  enrichWorldEventModality,
} from "./worldEventModality";
import { rankPlanRecallObservations } from "./worldEventPlanRecallPolicy";

function observation(input: {
  id: string;
  raw: string;
  modalityRaw?: string;
  polarity?: "positive" | "negative";
  createdAt: string;
}): WorldEventObservation {
  const event = enrichWorldEventModality({
    raw: input.modalityRaw || input.raw,
    eventType: "general",
    actor: { name: "Mert", source: "explicit_name", confidence: 0.95 },
    reportedSpeech: true,
    certainty: 0.9,
    ambiguities: [],
    evidence: [],
    proposition: {
      key: "mert|general|?|resign",
      predicate: "general",
      actorKey: "mert",
      contentKey: "resign",
    },
    polarity: input.polarity || "positive",
    temporal: { relation: "future", asksLatest: false },
  });
  event.raw = input.raw;
  return {
    id: input.id,
    userId: "user-1",
    sessionId: "session-1",
    kind: "reported_claim",
    status: "grounded",
    createdAt: input.createdAt,
    event,
  };
}

describe("Kaira modality and commitment contracts", () => {
  it("distinguishes bounded modality classes", () => {
    expect(detectWorldEventModality("belki istifa ederim").kind).toBe("possibility");
    expect(detectWorldEventModality("istifa etmeyi düşünüyorum").kind).toBe("intention");
    expect(detectWorldEventModality("istifa etmeyi planlıyorum").kind).toBe("plan");
    expect(detectWorldEventModality("istifa etmek istiyorum").kind).toBe("desire");
    expect(detectWorldEventModality("yarın istifa edeceğim").kind).toBe("commitment");
    expect(detectWorldEventModality("yarın istifa etmeyeceğim").kind).toBe("refusal");
  });

  it("keeps modality outside proposition identity", () => {
    const intention = observation({
      id: "i",
      raw: "Mert istifa etmeyi düşünüyor",
      createdAt: "2026-08-20T10:00:00.000Z",
    });
    const commitment = observation({
      id: "c",
      raw: "Mert yarın istifa edecek",
      createdAt: "2026-08-21T10:00:00.000Z",
    });
    expect(intention.event.proposition?.key).toBe(commitment.event.proposition?.key);
    expect(intention.event.modality?.kind).not.toBe(commitment.event.modality?.kind);
  });

  it("ranks stronger execution evidence above weaker modality", () => {
    const possibility = observation({ id: "poss", raw: "Mert belki istifa edecek", createdAt: "2026-08-23T10:00:00.000Z" });
    const intention = observation({ id: "intent", raw: "Mert istifa etmeyi düşünüyor", createdAt: "2026-08-22T10:00:00.000Z" });
    const plan = observation({ id: "plan", raw: "Mert istifa etmeyi planlıyor", createdAt: "2026-08-21T10:00:00.000Z" });
    const commitment = observation({ id: "commit", raw: "Mert yarın istifa edecek", createdAt: "2026-08-20T10:00:00.000Z" });

    const ranked = rankPlanRecallObservations({
      message: "Mert ne yapacaktı?",
      observations: [possibility, intention, plan, commitment],
    });

    expect(ranked.map((item) => item.observation.id)).toEqual(["commit", "plan", "intent", "poss"]);
  });

  it("never treats refusal or negative polarity as planned execution", () => {
    const refusal = observation({
      id: "no",
      raw: "Mert yarın istifa etmeyecek",
      modalityRaw: "yarın istifa etmeyeceğim",
      polarity: "negative",
      createdAt: "2026-08-22T10:00:00.000Z",
    });
    const plan = observation({
      id: "yes",
      raw: "Mert istifa etmeyi planlıyor",
      createdAt: "2026-08-21T10:00:00.000Z",
    });

    const ranked = rankPlanRecallObservations({
      message: "Mert ne yapacaktı?",
      observations: [refusal, plan],
    });

    expect(ranked.map((item) => item.observation.id)).toEqual(["yes"]);
  });
});
